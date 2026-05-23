import { GameController } from "@/components/GameController";
import { createInitialState } from "@/lib/games/gofish";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = {
  bot?: string;
};

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { bot } = await searchParams;

  if (bot !== "true") {
    redirect("/");
  }

  return <GameController initialState={createInitialState()} />;
}
