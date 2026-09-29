import { z } from "zod";
import { ModuleName } from "@/types/modules";
import { TicketCategory, TicketStatus } from "@/types/tickets";

// Mirrors backend/src/tickets/dto/createTicket.dto.ts plus the service's rule that a
// Modules ticket names its module and no other category does.
export const createTicketSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Give the ticket a short title (3+ characters)")
      .max(120, "Keep the title under 120 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Describe the problem (10+ characters)")
      .max(4000, "Keep the description under 4000 characters"),
    category: z.enum(TicketCategory),
    moduleName: z.enum(ModuleName).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.category === TicketCategory.MODULES && !value.moduleName) {
      ctx.addIssue({
        code: "custom",
        path: ["moduleName"],
        message: "Choose the module this is about",
      });
    }
    if (value.category !== TicketCategory.MODULES && value.moduleName) {
      ctx.addIssue({
        code: "custom",
        path: ["moduleName"],
        message: "Only Modules tickets name a module",
      });
    }
  });

export const updateTicketStatusSchema = z.object({
  status: z.enum(TicketStatus),
});
