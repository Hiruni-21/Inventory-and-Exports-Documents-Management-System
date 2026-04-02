import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AddDispatchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const customer = searchParams.get("customer");
    const nextUrl = customer
      ? `/dispatch/local?customer=${encodeURIComponent(customer)}`
      : "/dispatch/local";

    navigate(nextUrl, { replace: true });

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("fw-open-local-dispatch-modal"));
    }, 80);

    return () => window.clearTimeout(timer);
  }, [navigate, searchParams]);

  return null;
}