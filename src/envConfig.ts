import { asObject, asOptional, asString, asBoolean, asNumber } from "cleaners"
import CONFIG_JSON from '../config.json'
import { asBase16 } from "edge-core-js"

const asEnvConfig = asObject({
  API_KEY: asOptional(asString, ''),
  API_SECRET: asOptional(asBase16),
  APP_ID: asOptional(asString, ''),
  PLUGINS: asObject(asBoolean),
  MASTER_KEY: asString,
  USERNAME: asString,
  PASSWORD: asString,
  HTTP_PORT: asNumber
}).withRest

export const CONFIG = asEnvConfig(CONFIG_JSON)