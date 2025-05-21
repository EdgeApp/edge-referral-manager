import { asObject, asOptional, asString, asBoolean, asNumber } from "cleaners"
import CONFIG_JSON from '../config.json'

const asEnvConfig = asObject({
  API_KEY: asOptional(asString, ''),
  APP_ID: asOptional(asString, ''),
  PLUGINS: asObject(asBoolean),
  MASTER_KEY: asString,
  USERNAME: asString,
  PASSWORD: asString,
  HTTP_PORT: asNumber
}).withRest

export const CONFIG = asEnvConfig(CONFIG_JSON)