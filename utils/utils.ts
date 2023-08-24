import { UseToastOptions } from "@chakra-ui/react";
import { DigitalAsset, JsonMetadata, fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey, Umi } from "@metaplex-foundation/umi";

export const fetchNft = async (umi: Umi, nftAdress: PublicKey, toast?: (options: Omit<UseToastOptions, "id">) => void) => {
    let digitalAsset: DigitalAsset | undefined;
    let jsonMetadata: JsonMetadata | undefined;
    try {
        digitalAsset = await fetchDigitalAsset(umi, nftAdress);
        jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri)
    } catch (e) {
        console.error(e);

        !!toast &&
          toast({
              title: 'Nft could not be fetched!',
              description: "Please check your Wallet instead.",
              status: 'error',
              duration: 9000,
              isClosable: true,
          });
    }

    return { digitalAsset, jsonMetadata }
}