import { createFileRoute } from "@tanstack/react-router";
import { NotebookApp } from "@/components/notebook/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NotebookApp />;
}
