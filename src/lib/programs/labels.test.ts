import { describe, expect, it } from "vitest";
import { payLine } from "./labels";

describe("payLine", () => {
  it("always says whether it pays", () => {
    expect(payLine({ paid: true, pay_text: "$3,000 stipend" })).toBe("Paid: $3,000 stipend");
    expect(payLine({ paid: true, pay_text: null })).toBe("Paid");
    expect(payLine({ paid: false, pay_text: null })).toBe("Free, unpaid");
    expect(payLine({ paid: false, pay_text: "Some internships include a stipend" })).toBe("Free. Some internships include a stipend");
  });
});
