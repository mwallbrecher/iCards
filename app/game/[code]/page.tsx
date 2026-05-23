import { notFound, redirect } from "next/navigation";
import { GameRoom } from "@/app/game/[code]/GameRoom";
import { getGameViewAction } from "@/lib/games/gofish/actions";
import { GameNotFoundError } from "@/lib/games/gofish/repository";
import { getSessionToken } from "@/lib/session/token";

type Params = {
  code: string;
};

export default async function GameCodePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const token = await getSessionToken();

  if (!token) {
    redirect(`/game/${code}/join`);
  }

  let initialView;
  try {
    initialView = await getGameViewAction(code);
  } catch (caught) {
    if (caught instanceof GameNotFoundError) {
      notFound();
    }

    redirect(`/game/${code}/join`);
  }

  return (
    <GameRoom
      initialView={initialView}
      code={code}
      gameId={initialView.gameId}
    />
  );
}
