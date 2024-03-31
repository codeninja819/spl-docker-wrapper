import PreexistingMarket from "components/token/customMarket";
import Market from "components/token/market";
import RevokeMint from "components/token/mint";
import Mint from "../components/project/token";

export default function CurrentToken() {
  return (
    <>
      <Mint />
      <RevokeMint />
      <Market />
      <PreexistingMarket />
    </>
  );
}
