"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { formText } from "@/lib/form-data";
import { updateMyProfile } from "@/lib/profile/data";
import { makeProfileSchema, toProfileUpdate } from "@/lib/profile/schema";
import type { ProfileState } from "./state";

/**
 * Saves the profile form. Order: signed in (session user only, never an id
 * from the form), then zod, then update. Database checks back up zod.
 */
export async function saveProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  await requireUser("/account/profile");

  const values = {
    nickname: formText(formData, "nickname"),
    stage: formText(formData, "stage"),
    state: formText(formData, "state"),
    gradYear: formText(formData, "gradYear"),
    county: formText(formData, "county"),
  };

  const result = makeProfileSchema(new Date()).safeParse(values);
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    return {
      status: "invalid",
      values,
      fieldErrors: {
        nickname: errors.nickname?.[0],
        stage: errors.stage?.[0],
        state: errors.state?.[0],
        gradYear: errors.gradYear?.[0],
        county: errors.county?.[0],
      },
    };
  }

  const saved = toProfileUpdate(result.data);
  if (!(await updateMyProfile(saved))) {
    return {
      status: "error",
      values,
      fieldErrors: {},
      formError: "We couldn’t save your profile just now. Please try again.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile"); // a new state brings its counties
  revalidatePath("/scholarships");
  return {
    status: "saved",
    fieldErrors: {},
    // Show what was stored (trimmed nickname, cleared year for adult learners).
    values: {
      nickname: saved.nickname ?? "",
      stage: saved.stage,
      state: saved.state,
      gradYear: saved.grad_year === null ? "" : String(saved.grad_year),
      county: saved.county ?? "",
    },
  };
}
