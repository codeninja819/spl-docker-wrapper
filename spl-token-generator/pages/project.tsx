import Pool from "components/project/pool";
import Users from "../components/project/users/users";
import Zombie from "../components/project/zombie";
import PoolStatus from "components/project/poolStatus";

export default function Home() {
  return (
    <>
      <Zombie />
      <Pool />
      <PoolStatus />
      <Users />
    </>
  );
}
