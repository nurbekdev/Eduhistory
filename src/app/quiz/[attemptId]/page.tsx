import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { authOptions } from "@/lib/auth";
import { QuizAttemptRunner } from "@/features/quiz/components/quiz-attempt-runner";

type QuizAttemptPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function QuizAttemptPage({ params }: QuizAttemptPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/kirish");
  }

  const { attemptId } = await params;
  return (
    <PageContainer className="space-y-6">
      <SectionTitle title="Quiz urinish sahifasi" description="Timer, autosave va anti-leave himoyasi bilan attempt-runner." />
      <QuizAttemptRunner attemptId={attemptId} />
    </PageContainer>
  );
}
