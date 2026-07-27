'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';

/* ─────────────────────────── Types ─────────────────────────── */

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: QuizOption[];   // for multiple-choice & true-false
  correctAnswer: string;    // option id or exact text for short-answer
  explanation?: string;
  points?: number;
}

export interface QuizConfig {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimitSeconds?: number;    // 0 / undefined = no limit
  passingScore?: number;        // percentage (0–100)
  allowReview?: boolean;
}

export interface QuizResult {
  quizId: string;
  answers: Record<string, string>;   // questionId → answer
  score: number;                     // percentage
  earnedPoints: number;
  totalPoints: number;
  durationSeconds: number;
  passed: boolean;
}

type QuizPhase = 'intro' | 'active' | 'results' | 'review';

interface Props {
  quiz: QuizConfig;
  onComplete?: (result: QuizResult) => void;
}

/* ─────────────────────────── Helpers ─────────────────────────── */

const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { id: 'true', text: 'True' },
  { id: 'false', text: 'False' },
];

function normalise(s: string) {
  return s.trim().toLowerCase();
}

function isCorrect(question: QuizQuestion, answer: string): boolean {
  if (question.type === 'short-answer') {
    return normalise(answer) === normalise(question.correctAnswer);
  }
  return answer === question.correctAnswer;
}

function calcScore(questions: QuizQuestion[], answers: Record<string, string>) {
  let earned = 0;
  let total = 0;
  for (const q of questions) {
    const pts = q.points ?? 1;
    total += pts;
    if (answers[q.id] !== undefined && isCorrect(q, answers[q.id])) {
      earned += pts;
    }
  }
  return { earned, total, pct: total > 0 ? Math.round((earned / total) * 100) : 0 };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function QuizComponent({ quiz, onComplete }: Props) {
  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitSeconds ?? 0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];

  /* ── Timer ── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const submitQuiz = useCallback(
    (finalAnswers: Record<string, string>) => {
      stopTimer();
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const { earned, total, pct } = calcScore(quiz.questions, finalAnswers);
      const passing = quiz.passingScore ?? 60;
      const res: QuizResult = {
        quizId: quiz.id,
        answers: finalAnswers,
        score: pct,
        earnedPoints: earned,
        totalPoints: total,
        durationSeconds: elapsed,
        passed: pct >= passing,
      };
      setResult(res);
      setPhase('results');
      onComplete?.(res);
    },
    [quiz, stopTimer, onComplete]
  );

  useEffect(() => {
    if (phase !== 'active') return;
    if (!quiz.timeLimitSeconds) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitQuiz(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopTimer;
  }, [phase, quiz.timeLimitSeconds, submitQuiz, answers, stopTimer]);

  /* ── Start quiz ── */
  const handleStart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(quiz.timeLimitSeconds ?? 0);
    startTimeRef.current = Date.now();
    setPhase('active');
  };

  /* ── Record answer ── */
  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
  };

  /* ── Navigate ── */
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      submitQuiz(answers);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  /* ── Review mode ── */
  const handleReview = () => {
    setReviewIndex(0);
    setPhase('review');
  };

  /* ── Re-take ── */
  const handleRetake = () => {
    setResult(null);
    handleStart();
  };

  /* ════════════════ RENDER ════════════════ */

  /* ── Intro ── */
  if (phase === 'intro') {
    return (
      <Card className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xl" aria-hidden="true">
            📝
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{quiz.description}</p>
            )}
          </div>
        </div>

        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>📋 <span className="font-medium">{totalQuestions}</span> questions</li>
          {quiz.timeLimitSeconds && (
            <li>⏱️ Time limit: <span className="font-medium">{formatTime(quiz.timeLimitSeconds)}</span></li>
          )}
          {quiz.passingScore !== undefined && (
            <li>🎯 Passing score: <span className="font-medium">{quiz.passingScore}%</span></li>
          )}
        </ul>

        <Button onClick={handleStart} className="w-full">
          Start Quiz
        </Button>
      </Card>
    );
  }

  /* ── Active ── */
  if (phase === 'active' && currentQuestion) {
    const options =
      currentQuestion.type === 'true-false'
        ? TRUE_FALSE_OPTIONS
        : (currentQuestion.options ?? []);
    const selected = answers[currentQuestion.id];
    const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

    return (
      <Card className="max-w-xl mx-auto space-y-5">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          {quiz.timeLimitSeconds ? (
            <span
              className={`font-mono font-medium text-sm ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}
              aria-label={`Time remaining: ${formatTime(timeLeft)}`}
            >
              ⏱️ {formatTime(timeLeft)}
            </span>
          ) : null}
          <Badge variant="default">
            {currentQuestion.type === 'multiple-choice'
              ? 'Multiple Choice'
              : currentQuestion.type === 'true-false'
                ? 'True / False'
                : 'Short Answer'}
          </Badge>
        </div>

        <ProgressBar value={progress} label={`Progress: ${progress}%`} />

        {/* Question */}
        <p className="text-base font-medium text-gray-900 dark:text-white leading-relaxed">
          {currentQuestion.question}
        </p>

        {/* Options */}
        {currentQuestion.type !== 'short-answer' ? (
          <ul className="space-y-2" role="listbox" aria-label="Answer choices">
            {options.map((opt) => {
              const active = selected === opt.id;
              return (
                <li key={opt.id} role="none">
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => handleAnswer(opt.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm
                      ${active
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-medium'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-800 dark:text-gray-200'
                      }`}
                  >
                    {opt.text}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div>
            <label htmlFor="short-answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="short-answer"
              rows={3}
              value={selected ?? ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here…"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-3 pt-2">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            ← Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={selected === undefined}
          >
            {currentIndex === totalQuestions - 1 ? 'Submit Quiz' : 'Next →'}
          </Button>
        </div>

        {/* Question map */}
        <div className="border-t pt-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Question map</p>
          <div className="flex flex-wrap gap-1.5">
            {quiz.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to question ${i + 1}${answers[q.id] !== undefined ? ' (answered)' : ''}`}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors
                  ${i === currentIndex
                    ? 'bg-blue-600 text-white'
                    : answers[q.id] !== undefined
                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  /* ── Results ── */
  if (phase === 'results' && result) {
    const gradeColor =
      result.score >= 80
        ? 'text-green-600 dark:text-green-400'
        : result.score >= 60
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-red-600 dark:text-red-400';

    return (
      <Card className="max-w-xl mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="text-5xl" aria-hidden="true">
            {result.passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.passed ? 'Quiz Passed!' : 'Keep Practising!'}
          </h2>
          <p className={`text-5xl font-extrabold ${gradeColor}`}>{result.score}%</p>
          <Badge variant={result.passed ? 'success' : 'error'}>
            {result.passed ? 'Passed' : 'Not Passed'}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {result.earnedPoints}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              / {result.totalPoints} pts
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {quiz.questions.filter((q) => isCorrect(q, result.answers[q.id] ?? '')).length}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              / {totalQuestions} correct
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatTime(result.durationSeconds)}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">time taken</p>
          </div>
        </div>

        <ProgressBar
          value={result.score}
          label={`Score: ${result.score}%`}
        />

        {/* Per-question summary */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Question Summary
          </h3>
          {quiz.questions.map((q, i) => {
            const correct = result.answers[q.id] !== undefined && isCorrect(q, result.answers[q.id]);
            return (
              <div
                key={q.id}
                className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2
                  ${correct
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}
              >
                <span className="mt-0.5 shrink-0">{correct ? '✅' : '❌'}</span>
                <span className="truncate">
                  Q{i + 1}: {q.question}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {quiz.allowReview !== false && (
            <Button variant="outline" onClick={handleReview} className="flex-1">
              📖 Review Answers
            </Button>
          )}
          <Button onClick={handleRetake} className="flex-1">
            🔄 Retake Quiz
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Review ── */
  if (phase === 'review' && result) {
    const q = quiz.questions[reviewIndex];
    const userAnswer = result.answers[q.id] ?? '';
    const correct = isCorrect(q, userAnswer);
    const options =
      q.type === 'true-false' ? TRUE_FALSE_OPTIONS : (q.options ?? []);

    return (
      <Card className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            📖 Review Mode
          </h2>
          <Button variant="outline" onClick={() => setPhase('results')}>
            ← Back to Results
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Question {reviewIndex + 1} of {totalQuestions}
          </span>
          <Badge variant={correct ? 'success' : 'error'}>
            {correct ? '✅ Correct' : '❌ Incorrect'}
          </Badge>
        </div>

        <p className="font-medium text-gray-900 dark:text-white">{q.question}</p>

        {q.type !== 'short-answer' ? (
          <ul className="space-y-2">
            {options.map((opt) => {
              const isUserChoice = userAnswer === opt.id;
              const isCorrectChoice = q.correctAnswer === opt.id;
              let style =
                'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
              if (isCorrectChoice)
                style =
                  'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-medium';
              else if (isUserChoice && !isCorrectChoice)
                style =
                  'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 line-through';
              return (
                <li
                  key={opt.id}
                  className={`px-4 py-3 rounded-lg border-2 text-sm flex items-center gap-2 ${style}`}
                >
                  {isCorrectChoice && <span aria-hidden="true">✅</span>}
                  {isUserChoice && !isCorrectChoice && <span aria-hidden="true">❌</span>}
                  {opt.text}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500 dark:text-gray-400">Your answer: </span>
              <span className={correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {userAnswer || '(no answer)'}
              </span>
            </p>
            {!correct && (
              <p>
                <span className="text-gray-500 dark:text-gray-400">Correct answer: </span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {q.correctAnswer}
                </span>
              </p>
            )}
          </div>
        )}

        {q.explanation && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">💡 Explanation</p>
            <p>{q.explanation}</p>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setReviewIndex((i) => i - 1)}
            disabled={reviewIndex === 0}
          >
            ← Prev
          </Button>
          <Button
            onClick={() => setReviewIndex((i) => i + 1)}
            disabled={reviewIndex === totalQuestions - 1}
          >
            Next →
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
