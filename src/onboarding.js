import { onboardTenant } from "./api.js";
import { getActiveProfile, getAppSettings, patchAppSettings, saveSyncProfile, setActiveProfile } from "./storage.js";
import { sanitizeText, uid } from "./utils.js";

function slugify(input) {
  const value = sanitizeText(input || "tenant", 120).toLowerCase();
  return value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tenant";
}

function buildTenantId(tenantName) {
  const slug = slugify(tenantName).slice(0, 36);
  return `${slug}-${uid("tn").slice(-6)}`;
}

export async function startTenantOnboarding(payload) {
  const tenantName = sanitizeText(payload?.tenantName || "", 120);
  const adminEmail = sanitizeText(payload?.adminEmail || "", 180).toLowerCase();
  const plan = sanitizeText(payload?.plan || "starter", 20).toLowerCase() || "starter";
  if (!tenantName) {
    throw new Error("Tenant name is required.");
  }
  if (!adminEmail) {
    throw new Error("Admin email is required.");
  }

  const [settings, activeProfile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const fallbackTenantId = buildTenantId(tenantName);
  let onboardingResult = {
    tenantId: fallbackTenantId,
    tenantName,
    adminEmail,
    plan,
    driveFolderId: "",
    sheetId: "",
    endpoint: activeProfile?.endpoint || settings.auth?.googleSheetsEndpoint || ""
  };

  if (onboardingResult.endpoint) {
    try {
      const remote = await onboardTenant({ endpoint: onboardingResult.endpoint }, {
        tenantName,
        adminEmail,
        plan
      });
      onboardingResult = {
        ...onboardingResult,
        ...remote,
        endpoint: remote.endpoint || onboardingResult.endpoint
      };
    } catch (error) {
      // fallback to local onboarding payload if remote setup is unavailable
      onboardingResult.error = error?.message || "Remote onboarding failed.";
    }
  }

  const profileId = uid("acct");
  await saveSyncProfile({
    id: profileId,
    label: tenantName,
    gmail: adminEmail,
    tenantId: onboardingResult.tenantId || fallbackTenantId,
    endpoint: onboardingResult.endpoint || activeProfile?.endpoint || "",
    plan,
    subscriptionStatus: "trial",
    active: true
  });
  await setActiveProfile(profileId);

  const nextRegistry = (settings.tenantRegistry || []).filter((entry) => entry.tenantId !== (onboardingResult.tenantId || fallbackTenantId)).concat([{
    tenantId: onboardingResult.tenantId || fallbackTenantId,
    tenantName,
    adminEmail,
    plan,
    status: "active",
    driveFolderId: onboardingResult.driveFolderId || "",
    sheetId: onboardingResult.sheetId || "",
    endpoint: onboardingResult.endpoint || ""
  }]);

  await patchAppSettings({
    onboarding: {
      completed: true,
      currentTenantId: onboardingResult.tenantId || fallbackTenantId
    },
    tenantRegistry: nextRegistry,
    tenantPlans: {
      ...(settings.tenantPlans || {}),
      [profileId]: plan
    }
  });

  return onboardingResult;
}
