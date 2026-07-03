import { z } from "zod";
import { getAuthUser, requireAuth } from "@/lib/auth";
import {
  listReimbursementsForUser,
  listAllReimbursements,
  createReimbursement,
} from "@/lib/reimbursement-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  receipt: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const records =
      user.role === "admin"
        ? await listAllReimbursements()
        : await listReimbursementsForUser(user.id);
    return jsonOk({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const body = createSchema.parse(await request.json());
    const record = await createReimbursement(user.id, body);
    return jsonOk({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
