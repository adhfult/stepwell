import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Create your account</h1>
      <p className="mt-4">Save careers and colleges you like, and plan your next steps.</p>
      <SignUpForm thisYear={new Date().getUTCFullYear()} />
      <p className="mt-8">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
