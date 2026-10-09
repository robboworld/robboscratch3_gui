import {defineMessages} from 'react-intl';

/** Sensor type names: the sensor choose window and the sensor buttons of the palettes. */
const sensorTypeMessages = defineMessages({
    nosensor: {id: 'gui.RobboGui.SensorChoose.nosensor', description: 'Sensor type', defaultMessage: 'No sensor'},
    line: {id: 'gui.RobboGui.SensorChoose.line', description: 'Sensor type', defaultMessage: 'Line'},
    led: {id: 'gui.RobboGui.SensorChoose.led', description: 'Sensor type', defaultMessage: 'LED'},
    light: {id: 'gui.RobboGui.SensorChoose.light', description: 'Sensor type', defaultMessage: 'Light'},
    touch: {id: 'gui.RobboGui.SensorChoose.touch', description: 'Sensor type', defaultMessage: 'Touch'},
    proximity: {id: 'gui.RobboGui.SensorChoose.proximity', description: 'Sensor type', defaultMessage: 'Proximity'},
    ultrasonic: {id: 'gui.RobboGui.SensorChoose.ultrasonic', description: 'Sensor type', defaultMessage: 'Ultrasonic'},
    color: {id: 'gui.RobboGui.SensorChoose.color', description: 'Sensor type', defaultMessage: 'Color'},
    clamps: {id: 'gui.RobboGui.SensorChoose.clamps', description: 'Sensor type', defaultMessage: 'Clamps'},
    temperature: {id: 'gui.RobboGui.SensorChoose.temperature', description: 'Sensor type', defaultMessage: 'Temperature'}
});

const extraMessages = defineMessages({
    close: {id: 'gui.RobboGui.close', description: 'Close button of a window', defaultMessage: 'Close'},
    chooseSensor: {
        id: 'gui.RobboGui.SensorChoose.choose',
        description: 'Sensor button of a palette: {port} is "Sensor 1", {sensor} the sensor type',
        defaultMessage: '{port}: {sensor}. Choose sensor'
    }
});

const closeMessage = extraMessages.close;
const chooseSensorMessage = extraMessages.chooseSensor;

export {sensorTypeMessages, closeMessage, chooseSensorMessage};
