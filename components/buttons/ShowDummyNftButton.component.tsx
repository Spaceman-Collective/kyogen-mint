import { PublicKey, Umi, publicKey } from "@metaplex-foundation/umi";
import { PrimaryButton } from "./PrimaryButton.component";
import { fetchNft } from "@/utils/utils";
import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

interface DummyNftButtonProps {
  umi: Umi;
  mintsCreated:
    | {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
      }[]
    | undefined;
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >;
  onShowNftOpen: () => void;
  children: React.ReactNode
}

export const ShowDummyNftButton = ({
  umi,
  mintsCreated,
  setMintsCreated,
  onShowNftOpen,
}: DummyNftButtonProps) => {
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log("[ShowDummyNFtButton] loading", loading);
  }, [loading]);

  const handleShowNft = async () => {
    setLoading(true);
    let nftMint = publicKey("E3E7jG4TWutQsGHfRwVc2G9dnqrY7LvEoS6yLwEBUx2c");
    const fetchedNft = await fetchNft(umi, nftMint);

    if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
      if (mintsCreated === undefined) {
        setMintsCreated([
          {
            mint: nftMint,
            offChainMetadata: fetchedNft.jsonMetadata,
          },
        ]);
      } else {
        if (mintsCreated.length < 3) {
          setMintsCreated([
            ...mintsCreated,
            {
              mint: nftMint,
              offChainMetadata: fetchedNft.jsonMetadata,
            },
          ]);
        }
      }

      setLoading(false);
      onShowNftOpen();
    }
  };

  return (
    <PrimaryButton isLoading={loading} onClick={handleShowNft}>
      Show NFT
    </PrimaryButton>
  );
};