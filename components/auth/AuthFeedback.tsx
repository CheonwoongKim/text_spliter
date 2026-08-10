export type AuthFeedbackMessage = {
  type: "error" | "success";
  text: string;
};

interface AuthFeedbackProps {
  feedback: AuthFeedbackMessage | null;
  id?: string;
  className?: string;
}

export function AuthFeedback({ feedback, id, className = "" }: AuthFeedbackProps) {
  if (!feedback) return null;

  return (
    <p
      id={id}
      className={`${className} text-base ${
        feedback.type === "error" ? "text-danger" : "text-success"
      }`.trim()}
      role={feedback.type === "error" ? "alert" : "status"}
    >
      {feedback.text}
    </p>
  );
}
