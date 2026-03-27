/* eslint-disable valid-jsdoc, require-jsdoc, func-style */
/**
 * Детерминированная генерация Python (pyserial) из цепочки блоков под «когда флаг нажат».
 * Семантика моторов/поворотов согласована с scratch3_robot.js (без учёта инверсии моторов в MVP).
 * Хелперы и import serial/time подключаются только если в цепочке есть блоки, которым они нужны.
 * Документация: docs/python-translator.md
 */

const DEVICE_IS_READY = 6;
const DEGREE_RATIO = 5.19;

/** UART: команды как в platforms/desktop|web chrome.js, завершитель кадра 0x24. */
const ROBOT_HW_OPCODES = new Set([
    'robot_motors_on_for_seconds',
    'robot_motors_on',
    'robot_motors_off',
    'robot_set_direction_to',
    'robot_motors_on_for_steps',
    'robot_turnright',
    'robot_turnleft',
    'robot_set_motors_power',
    'robot_set_motors_power_left_right_separately',
    'robot_set_motors_left_right_power_and_direction_separately',
    'robot_turn_led_on',
    'robot_turn_led_off',
    'robot_claw_closed',
    'robot_claw_state'
]);

const POWER_FRAME_OPCODES = new Set([
    'robot_motors_on',
    'robot_motors_off',
    'robot_set_direction_to',
    'robot_set_motors_power',
    'robot_set_motors_power_left_right_separately',
    'robot_set_motors_left_right_power_and_direction_separately',
    'robot_motors_on_for_seconds',
    'robot_motors_on_for_steps',
    'robot_turnright',
    'robot_turnleft'
]);

const POWER_STEPS_OPCODES = new Set([
    'robot_motors_on_for_steps',
    'robot_turnright',
    'robot_turnleft'
]);

const TIME_IN_BODY_OPCODES = new Set([
    'robot_motors_on_for_seconds',
    'robot_motors_on_for_steps',
    'robot_turnright',
    'robot_turnleft'
]);

const LED_OPCODES = new Set(['robot_turn_led_on', 'robot_turn_led_off']);
const CLAW_OPCODES = new Set(['robot_claw_closed', 'robot_claw_state']);

const LED_POSITION_BITS = {
    position1: 1,
    position2: 2,
    position3: 4,
    position4: 8,
    position5: 16
};

const clampPercent = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

const check65535 = n => {
    const x = Math.round(Number(n) || 0);
    return x > 65535 ? 65535 : x;
};

export function getReadyRobotPortBaud (vm) {
    const rca = vm && typeof vm.getRCA === 'function' ? vm.getRCA() : null;
    const robots = (rca && rca.ConnectedRobots) || [];
    const dev = robots.find(
        d => d && typeof d.getState === 'function' && d.getState() === DEVICE_IS_READY
    );
    if (!dev || typeof dev.getPortName !== 'function') {
        return {portName: 'COM?', baudRate: null};
    }
    const portName = dev.getPortName();
    let baudRate = null;
    if (typeof dev.getBaudRate === 'function') {
        baudRate = dev.getBaudRate();
    }
    if (baudRate === null || typeof baudRate !== 'number' || Number.isNaN(baudRate)) {
        baudRate = 115200;
    }
    return {portName, baudRate};
}

function getBlock (blocks, id) {
    if (!id || !blocks) return null;
    return blocks.getBlock(id);
}

function getInputBlockId (block, inputName) {
    if (!block || !block.inputs || !block.inputs[inputName]) return null;
    const inp = block.inputs[inputName];
    return inp.block || null;
}

function getNumberFromBlocks (blocks, blockId) {
    const b = getBlock(blocks, blockId);
    if (!b) return 0;
    if (b.opcode === 'math_number' || b.opcode === 'math_positive_number' || b.opcode === 'math_whole_number') {
        const raw = b.fields && b.fields.NUM && b.fields.NUM.value;
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function getDirectionFromInput (blocks, blockId) {
    const b = getBlock(blocks, blockId);
    if (!b) return 'direction_forward';
    if (b.opcode === 'robot_directions' && b.fields && b.fields.ROBOT_DIRECTION) {
        return b.fields.ROBOT_DIRECTION.value || 'direction_forward';
    }
    if (b.opcode === 'robot_one_motor_directions' && b.fields && b.fields.ROBOT_ONE_MOTOR_DIRECTION) {
        return b.fields.ROBOT_ONE_MOTOR_DIRECTION.value || 'direction_forward';
    }
    return 'direction_forward';
}

function getLedPositionFromInput (blocks, blockId) {
    const b = getBlock(blocks, blockId);
    if (!b || b.opcode !== 'robot_positions' || !b.fields || !b.fields.ROBOT_POSITION) {
        return null;
    }
    return b.fields.ROBOT_POSITION.value || null;
}

function getClawStateDegrees (blocks, blockId) {
    const b = getBlock(blocks, blockId);
    if (!b || b.opcode !== 'claw_states' || !b.fields || !b.fields.CLAW_STATES) {
        return null;
    }
    const v = b.fields.CLAW_STATES.value;
    switch (v) {
    case 'claw_open': return 0;
    case 'claw_half_open': return 50;
    case 'claw_closed': return 100;
    default: return null;
    }
}

function applyDirection (state, direction) {
    const pl = Math.round(state.power_in_percent_left * 0.63);
    const pr = Math.round(state.power_in_percent_right * 0.63);
    switch (direction) {
    case 'direction_forward':
        state.power_left = pl;
        state.power_right = pr;
        break;
    case 'direction_backward':
        state.power_left = pl + 64;
        state.power_right = pr + 64;
        break;
    case 'direction_left':
        state.power_left = pl + 64;
        state.power_right = pr;
        break;
    case 'direction_right':
        state.power_left = pl;
        state.power_right = pr + 64;
        break;
    default:
        state.power_left = pl;
        state.power_right = pr;
    }
}

function applyLeftRightDirections (state, leftDir, rightDir) {
    const plPct = state.power_in_percent_left;
    const prPct = state.power_in_percent_right;
    switch (leftDir) {
    case 'direction_forward':
        state.power_left = Math.round(plPct * 0.63);
        break;
    case 'direction_backward':
        state.power_left = Math.round(plPct * 0.63) + 64;
        break;
    default:
        state.power_left = Math.round(plPct * 0.63);
    }
    switch (rightDir) {
    case 'direction_forward':
        state.power_right = Math.round(prPct * 0.63);
        break;
    case 'direction_backward':
        state.power_right = Math.round(prPct * 0.63) + 64;
        break;
    default:
        state.power_right = Math.round(prPct * 0.63);
    }
}

function findFlagScriptFirstBlockId (blocks) {
    const scripts = blocks.getScripts();
    for (let i = 0; i < scripts.length; i++) {
        const hatId = scripts[i];
        const hat = getBlock(blocks, hatId);
        if (hat && hat.opcode === 'event_whenflagclicked') {
            const substack = blocks.getBranch(hatId, 1);
            if (substack) return substack;
            return blocks.getNextBlock(hatId);
        }
    }
    return null;
}

function collectOpcodesInChain (blocks, firstId) {
    const list = [];
    let curId = firstId;
    while (curId) {
        const block = getBlock(blocks, curId);
        if (!block) break;
        list.push(block.opcode);
        curId = block.next;
    }
    return list;
}

function buildNeeds (opcodes) {
    const set = new Set(opcodes);
    const needs = {
        serial: false,
        powerFrame: false,
        powerSteps: false,
        robLamps: false,
        robClaw: false,
        timeImport: false,
        ledMaskVar: false
    };
    for (const o of set) {
        if (ROBOT_HW_OPCODES.has(o)) needs.serial = true;
        if (POWER_FRAME_OPCODES.has(o)) needs.powerFrame = true;
        if (POWER_STEPS_OPCODES.has(o)) needs.powerSteps = true;
        if (LED_OPCODES.has(o)) {
            needs.robLamps = true;
            needs.ledMaskVar = true;
        }
        if (CLAW_OPCODES.has(o)) needs.robClaw = true;
        if (TIME_IN_BODY_OPCODES.has(o)) needs.timeImport = true;
    }
    if (needs.serial) needs.timeImport = true;
    return needs;
}

function appendPythonHelpers (lines, needs) {
    if (needs.powerFrame) {
        lines.push('def power_frame(s, l, r):');
        lines.push('    s.write(bytes([ord("c"), int(l) & 0xFF, int(r) & 0xFF, 0x24]))');
        lines.push('    s.flush()');
        lines.push('');
    }
    if (needs.powerSteps) {
        lines.push('def power_steps(s, l, r, steps):');
        lines.push('    steps = int(steps) & 0xFFFF');
        lines.push('    hi = (steps >> 8) & 0xFF');
        lines.push('    lo = steps & 0xFF');
        lines.push('    s.write(bytes([ord("g"), int(l) & 0xFF, int(r) & 0xFF, hi, lo, 0x24]))');
        lines.push('    s.flush()');
        lines.push('');
    }
    if (needs.robLamps) {
        lines.push('def rob_lamps(s, mask):');
        lines.push('    s.write(bytes([ord("h"), int(mask) & 0xFF, 0x24]))');
        lines.push('    s.flush()');
        lines.push('');
    }
    if (needs.robClaw) {
        lines.push('def rob_claw(s, degrees):');
        lines.push('    s.write(bytes([ord("j"), int(degrees) & 0xFF, 0x24]))');
        lines.push('    s.flush()');
        lines.push('');
    }
}

function defaultOpcodeComment (op) {
    if (
        op === 'robot_get_sensor_data' ||
        op === 'robot_get_rgb_sensor_data' ||
        op === 'robot_is_current_color' ||
        op === 'robot_start_button_pressed' ||
        op === 'robot_set_sens' ||
        op === 'robot_get_dist' ||
        op === 'robot_touch' ||
        op === 'getSensorDataFromLastUtil'
    ) {
        return `# ${op}: репортёр/условие — в линейной цепочке под флагом не поддерживается (нужен контекст выражения)`;
    }
    if (op.startsWith('robot_')) {
        return `# TODO: робот-опкод ${op} — нет однозначного UART-эквивалента в этом экспорте`;
    }
    return `# TODO: неподдерживаемый опкод ${op}`;
}

export function generateRobotPythonScript (blocks, opts) {
    const portName = opts.portName || 'COM?';
    const baudRate = (typeof opts.baudRate === 'number' && !Number.isNaN(opts.baudRate)) ? opts.baudRate : 115200;
    const spriteName = opts.spriteName || '';

    const firstId = findFlagScriptFirstBlockId(blocks);
    const opcodeList = collectOpcodesInChain(blocks, firstId);
    const needs = buildNeeds(opcodeList);

    const lines = [];
    lines.push('# Сгенерировано из Robbo Scratch. Подключите робота и при необходимости поправьте PORT.');
    if (spriteName) lines.push(`# Спрайт: ${spriteName}`);

    if (needs.serial) {
        lines.push(`PORT = ${JSON.stringify(portName)}`);
        lines.push(`BAUD = ${baudRate}`);
        lines.push('');
    } else {
        lines.push('# В цепочке нет UART-команд робота (или есть только неэкспортируемые блоки).');
        lines.push('');
    }

    if (needs.timeImport) lines.push('import time');
    if (needs.serial) lines.push('import serial');
    if (needs.timeImport || needs.serial) lines.push('');

    appendPythonHelpers(lines, needs);

    const indent = needs.serial ? '    ' : '';
    const body = [];
    const emit = line => {
        body.push(`${indent}${line}`);
    };

    const state = {
        power_in_percent_left: 50,
        power_in_percent_right: 50,
        robot_direction: 'direction_forward',
        power_left: 32,
        power_right: 32,
        is_motors_on_active: false
    };
    applyDirection(state, state.robot_direction);

    if (needs.serial) {
        lines.push('s = serial.Serial(PORT, BAUD)');
        lines.push('try:');
        lines.push('    time.sleep(2)');
        if (needs.ledMaskVar) {
            lines.push('    _led_mask = 0');
        }
    }

    let curId = firstId;
    while (curId) {
        const block = getBlock(blocks, curId);
        if (!block) break;
        const op = block.opcode;

        switch (op) {
        case 'robot_set_direction_to': {
            const dirId = getInputBlockId(block, 'ROBOT_DIRECTION');
            state.robot_direction = getDirectionFromInput(blocks, dirId);
            applyDirection(state, state.robot_direction);
            emit(`# set_direction ${state.robot_direction}`);
            if (state.is_motors_on_active) {
                emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            }
            break;
        }
        case 'robot_set_motors_power': {
            const pid = getInputBlockId(block, 'POWER');
            const p = clampPercent(getNumberFromBlocks(blocks, pid), 0, 100);
            state.power_in_percent_left = p;
            state.power_in_percent_right = p;
            applyDirection(state, state.robot_direction);
            emit(`# set_motors_power ${p}%`);
            if (state.is_motors_on_active) {
                emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            }
            break;
        }
        case 'robot_set_motors_power_left_right_separately': {
            const lid = getInputBlockId(block, 'POWER_LEFT');
            const rid = getInputBlockId(block, 'POWER_RIGHT');
            state.power_in_percent_left = clampPercent(getNumberFromBlocks(blocks, lid), 0, 100);
            state.power_in_percent_right = clampPercent(getNumberFromBlocks(blocks, rid), 0, 100);
            applyDirection(state, state.robot_direction);
            emit(`# set_motors_power L=${state.power_in_percent_left} R=${state.power_in_percent_right}`);
            if (state.is_motors_on_active) {
                emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            }
            break;
        }
        case 'robot_set_motors_left_right_power_and_direction_separately': {
            const ldirId = getInputBlockId(block, 'ROBOT_LEFT_MOTOR_DIRECTION');
            const rdirId = getInputBlockId(block, 'ROBOT_RIGHT_MOTOR_DIRECTION');
            const lid = getInputBlockId(block, 'POWER_LEFT');
            const rid = getInputBlockId(block, 'POWER_RIGHT');
            const leftDir = getDirectionFromInput(blocks, ldirId);
            const rightDir = getDirectionFromInput(blocks, rdirId);
            state.power_in_percent_left = clampPercent(getNumberFromBlocks(blocks, lid), 0, 100);
            state.power_in_percent_right = clampPercent(getNumberFromBlocks(blocks, rid), 0, 100);
            applyLeftRightDirections(state, leftDir, rightDir);
            emit('# set L/R power+dir');
            if (state.is_motors_on_active) {
                emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            }
            break;
        }
        case 'robot_motors_on':
            state.is_motors_on_active = true;
            emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            break;
        case 'robot_motors_off':
            state.is_motors_on_active = false;
            emit('power_frame(s, 0, 0)');
            break;
        case 'robot_motors_on_for_seconds': {
            const sid = getInputBlockId(block, 'SECONDS');
            const sec = Math.max(0, getNumberFromBlocks(blocks, sid));
            emit(`power_frame(s, ${state.power_left}, ${state.power_right})`);
            emit(`time.sleep(${sec})`);
            emit('power_frame(s, 0, 0)');
            state.is_motors_on_active = false;
            break;
        }
        case 'robot_motors_on_for_steps': {
            const sid = getInputBlockId(block, 'STEPS');
            const steps = check65535(getNumberFromBlocks(blocks, sid));
            if (steps <= 0) {
                emit('# steps <= 0');
            } else {
                emit(`power_steps(s, ${state.power_left}, ${state.power_right}, ${steps})`);
                emit(`time.sleep(max(0.4, ${steps} * 0.012))`);
                emit('power_frame(s, 0, 0)');
            }
            state.is_motors_on_active = false;
            break;
        }
        case 'robot_turnright': {
            const degId = getInputBlockId(block, 'DEGREES');
            const deg = Math.max(0, getNumberFromBlocks(blocks, degId));
            const steps = check65535(Math.round(deg / DEGREE_RATIO));
            const pl = Math.round(30 * 0.63);
            const pr = Math.round(30 * 0.63) + 64;
            if (steps <= 0) {
                emit('# turn right degrees <= 0');
            } else {
                emit(`# turn right ${deg}° (~steps ${steps})`);
                emit(`power_steps(s, ${pl}, ${pr}, ${steps})`);
                emit(`time.sleep(max(0.5, ${deg} * 0.025))`);
                emit('power_frame(s, 0, 0)');
            }
            break;
        }
        case 'robot_turnleft': {
            const degId = getInputBlockId(block, 'DEGREES');
            const deg = Math.max(0, getNumberFromBlocks(blocks, degId));
            const steps = check65535(Math.round(deg / DEGREE_RATIO));
            const pl = Math.round(30 * 0.63) + 64;
            const pr = Math.round(30 * 0.63);
            if (steps <= 0) {
                emit('# turn left degrees <= 0');
            } else {
                emit(`# turn left ${deg}° (~steps ${steps})`);
                emit(`power_steps(s, ${pl}, ${pr}, ${steps})`);
                emit(`time.sleep(max(0.5, ${deg} * 0.025))`);
                emit('power_frame(s, 0, 0)');
            }
            break;
        }
        case 'robot_turn_led_on': {
            const posId = getInputBlockId(block, 'ROBOT_POSITION');
            const pos = getLedPositionFromInput(blocks, posId);
            const bit = pos ? LED_POSITION_BITS[pos] : 0;
            if (!bit) {
                emit('# robot_turn_led_on: не удалось разрешить позицию LED');
            } else {
                emit(`_led_mask |= ${bit}`);
                emit('rob_lamps(s, _led_mask)');
            }
            break;
        }
        case 'robot_turn_led_off': {
            const posId = getInputBlockId(block, 'ROBOT_POSITION');
            const pos = getLedPositionFromInput(blocks, posId);
            const bit = pos ? LED_POSITION_BITS[pos] : 0;
            if (!bit) {
                emit('# robot_turn_led_off: не удалось разрешить позицию LED');
            } else {
                emit(`_led_mask &= ~${bit}`);
                emit('rob_lamps(s, _led_mask)');
            }
            break;
        }
        case 'robot_claw_closed': {
            const cid = getInputBlockId(block, 'CLAW_CLOSED_PERCENT');
            const deg = clampPercent(getNumberFromBlocks(blocks, cid), 0, 100);
            emit(`rob_claw(s, ${Math.round(deg)})`);
            break;
        }
        case 'robot_claw_state': {
            const sid = getInputBlockId(block, 'CLAW_STATES');
            const d = getClawStateDegrees(blocks, sid);
            if (d === null) {
                emit('# robot_claw_state: ожидается блок claw_states');
            } else {
                emit(`rob_claw(s, ${d})`);
            }
            break;
        }
        case 'robot_reset_trip_meters':
            emit('# robot_reset_trip_meters: сброс одометра в RCA, отдельной UART-команды нет');
            break;
        default:
            emit(defaultOpcodeComment(op));
        }

        curId = block.next;
    }

    if (body.length === 0) {
        emit('# Нет цепочки под «когда флаг нажат» или только комментарии');
    }

    lines.push(...body);

    if (needs.serial) {
        lines.push('finally:');
        lines.push('    s.reset_input_buffer()');
        lines.push('    s.close()');
    }

    lines.push('');
    return lines.join('\n');
}
