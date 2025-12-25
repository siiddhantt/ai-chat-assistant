export * from "./types.js";
export * from "./registry.js";
export * from "./utils/index.js";
export * from "./constants/index.js";
export { ScheduleAppointmentTool } from "./implementations/schedule-appointment.js";

import { ScheduleAppointmentTool } from "./implementations/schedule-appointment.js";
import { getToolRegistry } from "./registry.js";

export function initializeTools(): void {
  const registry = getToolRegistry();
  registry.register(new ScheduleAppointmentTool());
}
