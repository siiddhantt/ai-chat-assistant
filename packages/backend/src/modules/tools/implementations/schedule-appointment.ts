import {
  BUSINESS_HOURS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
  ServiceType,
} from "../constants/index.js";
import { BaseTool } from "../registry.js";
import { ToolDefinition, ToolResult } from "../types.js";
import {
  formatDateTime,
  generateId,
  validateBusinessHours,
  validateEmail,
  validateEnum,
  validateFutureDate,
  validateMinLength,
} from "../utils/index.js";

interface ScheduleAppointmentArgs {
  customerName: string;
  customerEmail: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: ServiceType;
  notes: string | null;
}

export class ScheduleAppointmentTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: "schedule_appointment",
    description:
      "Schedule a customer appointment for store services. Use this when a customer wants to book a consultation, product demo, technical support session, or any in-store service. The appointment will be confirmed and a confirmation email will be sent to the customer.",
    parameters: {
      type: "object",
      properties: {
        customerName: {
          type: "string",
          description: "Full name of the customer booking the appointment",
        },
        customerEmail: {
          type: "string",
          description: "Email address for sending appointment confirmation",
        },
        preferredDate: {
          type: "string",
          description:
            "Preferred date for the appointment in YYYY-MM-DD format",
        },
        preferredTime: {
          type: "string",
          description:
            "Preferred time for the appointment in HH:MM format (24-hour)",
        },
        serviceType: {
          type: "string",
          description: "Type of service or consultation requested",
          enum: [...SERVICE_TYPES],
        },
        notes: {
          type: ["string", "null"],
          description: "Additional notes or special requests from the customer",
        },
      },
      required: [
        "customerName",
        "customerEmail",
        "preferredDate",
        "preferredTime",
        "serviceType",
        "notes",
      ],
    },
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const input = args as unknown as ScheduleAppointmentArgs;

    const validationError = this.validateInput(input);
    if (validationError) {
      return {
        toolCallId: "",
        success: false,
        error: validationError,
      };
    }

    const appointmentDetails = {
      appointmentId: generateId("APT"),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      scheduledDateTime: formatDateTime(
        input.preferredDate,
        input.preferredTime
      ),
      serviceType: SERVICE_TYPE_LABELS[input.serviceType],
      notes: input.notes || "None",
      status: "confirmed",
      confirmationSent: true,
    };

    return {
      toolCallId: "",
      success: true,
      result: {
        message: `Appointment successfully scheduled for ${input.customerName}`,
        appointment: appointmentDetails,
        nextSteps: [
          `Confirmation email sent to ${input.customerEmail}`,
          "Customer will receive a reminder 24 hours before the appointment",
          "Appointment can be modified or cancelled up to 2 hours in advance",
        ],
      },
    };
  }

  private validateInput(input: ScheduleAppointmentArgs): string | null {
    const nameValidation = validateMinLength(
      input.customerName,
      2,
      "Customer name"
    );
    if (!nameValidation.valid) return nameValidation.error!;

    const emailValidation = validateEmail(input.customerEmail);
    if (!emailValidation.valid) return emailValidation.error!;

    const dateValidation = validateFutureDate(input.preferredDate);
    if (!dateValidation.valid)
      return `Appointment ${dateValidation.error!.toLowerCase()}`;

    const timeValidation = validateBusinessHours(
      input.preferredTime,
      BUSINESS_HOURS.start,
      BUSINESS_HOURS.end
    );
    if (!timeValidation.valid) return timeValidation.error!;

    const serviceValidation = validateEnum(
      input.serviceType,
      SERVICE_TYPES,
      "service type"
    );
    if (!serviceValidation.valid) return serviceValidation.error!;

    return null;
  }
}
