CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

CREATE INDEX "LessonProgress_enrollmentId_status_idx" ON "LessonProgress"("enrollmentId", "status");
CREATE INDEX "LessonProgress_status_completedAt_idx" ON "LessonProgress"("status", "completedAt");

CREATE INDEX "QuizAttempt_quizId_status_idx" ON "QuizAttempt"("quizId", "status");
CREATE INDEX "QuizAttempt_enrollmentId_status_idx" ON "QuizAttempt"("enrollmentId", "status");
CREATE INDEX "QuizAttempt_userId_quizId_status_idx" ON "QuizAttempt"("userId", "quizId", "status");

CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");
CREATE INDEX "Certificate_issuedAt_idx" ON "Certificate"("issuedAt");
