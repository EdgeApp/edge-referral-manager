import { asObject, asOptional, asString, asBoolean, asNumber, asEither } from "cleaners"
import CONFIG_JSON from '../config.json'
import { asBase16 } from "edge-core-js"

const asEnvConfig = asObject({
  API_KEY: asOptional(asString, ''),
  API_SECRET: asOptional(asBase16),
  APP_ID: asOptional(asString, ''),
  PLUGINS: asObject(asEither(asBoolean, asObject(asString))),
  MASTER_KEY: asString,
  USERNAME: asString,
  PASSWORD: asString,
  OTP_KEY: asOptional(asString, ''),
  HTTP_PORT: asNumber
}).withRest

export const CONFIG = asEnvConfig(CONFIG_JSON)