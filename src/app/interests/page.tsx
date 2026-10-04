import type { Metadata } from "next";
import { Band, Page, PageTitle } from "@/components/page";
import { ResultPanel } from "@/components/form";
import { getQuestions } from "@/lib/interests/data";
import { QuizForm } from "./quiz-form";
import { InterestSource } from "./source-line";

export const metadata: Metadata = { title: "Interest quiz" };

export default async function InterestQuizPage() {
  const questions = await getQuestions();

  return (
    <>
      <Band width="reading">
        <PageTitle>Interest quiz</PageTitle>
        <p className="mt-4">
          Not sure what you want to do? For each activity below, say how you’d feel about doing it as a job. Don’t think
          about pay or school, just whether you’d like the work. Stepwell then shows careers that fit your interests.
        </p>
        <p className="mt-3">
          60 questions, about 5 to 10 minutes. No account needed, and nothing is saved unless you choose to save it.
        </p>
      </Band>
      <Page>
        {questions ? (
          <QuizForm questions={questions} />
        ) : (
          <ResultPanel title="The quiz isn’t ready yet" tone="error">
            <p>We’re still loading the questions. Try again later.</p>
          </ResultPanel>
        )}
        <InterestSource />
      </Page>
    </>
  );
}
