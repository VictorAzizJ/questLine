import { GameRoomClient } from "@/components/game/game-room-client";

type GamePageProps = {
  params: {
    gameId: string;
  };
};

export default function GamePage({ params }: GamePageProps) {
  return <GameRoomClient gameId={params.gameId} />;
}
