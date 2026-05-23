import { JoinGameClient } from "@/app/game/[code]/JoinGameClient";

type Params = {
  code: string;
};

export default async function JoinGamePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  return <JoinGameClient code={code} />;
}
