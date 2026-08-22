import { proxyToBackend } from "@/lib/proxy-route";
import { requireAnalystOrAdmin } from "@/lib/api-guards";
import { createVmAssetSchema } from "@/lib/validations/vm";

// First real route built against proxyToBackend() (see its own doc comment in
// src/lib/proxy-route.ts) — proves the helper's shape before ~35 more routes reuse it
// across the other five modules in Phases 4-8.

// Open to any authenticated tenant role, matching VmController.listAssets' lack of a
// @Roles() decorator (see backend/CLAUDE.md's module plan, decision 9).
export const GET = proxyToBackend({
  method: "GET",
  path: "/vm/assets",
  fallbackErrorMessage: "Failed to load assets",
});

// Admin/Analyst only, matching VmController.createAsset's @Roles(ADMIN, ANALYST).
export const POST = proxyToBackend({
  method: "POST",
  path: "/vm/assets",
  schema: createVmAssetSchema,
  guard: requireAnalystOrAdmin,
  fallbackErrorMessage: "Failed to create asset",
});
