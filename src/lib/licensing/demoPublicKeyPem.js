/**
 * Demo JWT verification key for local ЛК / activation servers (`kid: demo-rs3-1`).
 * Must match the public half of the RSA key used by the activation signer
 * (e.g. robbo_personal_account/backend/keys/licensing/dev-public.pem, or
 * rs3-activation-mock/keys/demo-public.pem when using that mock).
 * Accepted only outside production builds — not a production trust root.
 */

export default `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArRZS1qQGZT+zJJJXJSyP
3wnPM5BPCnOHT2iom96Vwfu5N/r/m81nZRlEzQj2tT/yHJCLKk/+nLtSoAKcvgx1
P1+czPW36EY5kcc0kLu3UkiOPyekHiuvpAsPVhxDQ07Y8RUOp0AxR7KwcGJd95oB
WqF3eHF7Qh+4q4V1WYo8oLBuzivShcEpzKNjEOU08RziyP8Z1ZbM3WpPlsV0pm55
WPegD80Y/N5iYUeTFmBo0KjdCBGnY5E3rTIwHY3RVHu7bIckaE7NVv5ArjGVpdxw
8hyItO+qJ5SDN7tpQyLTUWCF8FyXb8ElseOS6kq271/YYsitd6JfLullxNtrieuK
OQIDAQAB
-----END PUBLIC KEY-----
`;
