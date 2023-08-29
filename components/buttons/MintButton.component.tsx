import { GuardReturn } from "@/utils/checkerHelper";
import { GuardButtonList, mintArgsBuilder, routeBuilder } from "@/utils/mintHelper";
import { ButtonProps, Tooltip, UseToastOptions } from "@chakra-ui/react";
import { CandyGuard, CandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { DigitalAssetWithToken, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { KeypairSigner, PublicKey, Transaction, TransactionBuilder, TransactionWithMeta, Umi, createBigInt, generateSigner, none, some, transactionBuilder } from "@metaplex-foundation/umi";
import { Dispatch, SetStateAction } from "react";
import { PrimaryButton } from "./PrimaryButton.component";
import { mintText } from "@/settings";
import { fetchNft } from "@/utils/utils";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";

interface MintButtonProps extends ButtonProps {
  umi: Umi;
  guardList: GuardReturn[];
  candyMachine: CandyMachine | undefined;
  candyGuard: CandyGuard | undefined;
  ownedTokens: DigitalAssetWithToken[] | undefined;
  toast: (options: Omit<UseToastOptions, "id">) => void;
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>;
  mintsCreated:
    | {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
      }[];
  setMintsCreated: Dispatch<
    SetStateAction<
      { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    >
  >;
  onOpen: () => void;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string | undefined>>;
  numNFTs?: number;
}

const detectBotTax = (logs: string[]) => {
    if (logs.find((l) => l.includes("Candy Guard Botting"))) {
        throw new Error(`Candy Guard Bot Tax triggered. Check transaction`);
    }
    return false;
}



const updateLoadingText = (
  loadingText: string | undefined,
  guardList: GuardReturn[],
  label: string,
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>
) => {
  const guardIndex = guardList.findIndex((g) => g.label === label);
  if (guardIndex === -1) {
    console.error("guard not found");
    return;
  }
  const newGuardList = [...guardList];
  newGuardList[guardIndex].loadingText = loadingText;
  setGuardList(newGuardList);
};

const mintClick = async (
    umi: Umi,
    guard: GuardReturn,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    ownedTokens: DigitalAssetWithToken[],
    toast: (options: Omit<UseToastOptions, "id">) => void,
    mintsCreated: {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
    }[],
    setMintsCreated: Dispatch<SetStateAction<{ mint: PublicKey; offChainMetadata: JsonMetadata | undefined; }[]>>,
    guardList: GuardReturn[],
    setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
    onOpen: () => void,
    setCheckEligibility: Dispatch<SetStateAction<boolean>>,
    numNFTs: number
) => {
  // const guardToUse = chooseGuardToUse(guard, candyGuard);
  const guardToUse = { label: "default", guards: candyGuard.guards };

  if (!guardToUse.guards) {
    console.error("no guard defined!");
    return;
  }

  try {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }

    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = true;
    setGuardList(newGuardList);

    let routeBuild = await routeBuilder(umi, guardToUse, candyMachine);
    if (!routeBuild) {
      routeBuild = transactionBuilder();
    }

    const nftMintArr: KeypairSigner[] = [];
    const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens);

    let txArray: Transaction[] = [];
    let lastSignature: Uint8Array | undefined;
    for (let index = 0; index < numNFTs; index++) {
      const nftMint = generateSigner(umi);
      nftMintArr.push(nftMint);

      const tx = transactionBuilder()
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            nftMint,
            group:
              guardToUse.label === "default" ? none() : some(guardToUse.label),
            candyGuard: candyGuard.publicKey,
            mintArgs,
            tokenStandard: candyMachine.tokenStandard,
          })
        )
        .add(routeBuild)
        .prepend(setComputeUnitLimit(umi, { units: 800_000 }));

      if (!tx) return;

      /* Besides user, the mint tx has to be signed by `nftMint` also */
      const builtTransaction = await tx.buildWithLatestBlockhash(umi);
      const signedTransaction = await nftMint.signTransaction(builtTransaction);

      txArray.push(signedTransaction);
    }

    const signedTxs = await umi.identity.signAllTransactions(txArray);

    for (let signedTx of signedTxs) {
      let web3tx = toWeb3JsTransaction(signedTx);

      // console.log('[sending] signedTx', Buffer.from(web3tx.serialize()).toString('base64'));
      lastSignature = await umi.rpc.sendTransaction(signedTx);
      // console.log('[signature]', Buffer.from(lastSignature).toString('base64'));
    }

    if (!lastSignature) {
      // throw error that no tx was created
      throw new Error("no tx was created");
    }

    updateLoadingText(
      `finalizing transaction`,
      guardList,
      guardToUse.label,
      setGuardList
    );

    toast({
      title: "Mint successful!",
      description: `You can find your NFT in your wallet.`,
      status: "success",
      duration: 90000,
      isClosable: true,
    });

    //loop umi.rpc.getTransaction(lastSignature) until it does not return null. Sleep 1 second between each try.
    let transaction: TransactionWithMeta | null = null;
    for (let i = 0; i < 30; i++) {
      transaction = await umi.rpc.getTransaction(lastSignature);
      if (transaction) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (transaction === null) {
      throw new Error(`no tx on chain for signature ${lastSignature}`);
    }

    const logs: string[] = transaction.meta.logs;
    detectBotTax(logs);

    updateLoadingText(
      "Fetching your NFT",
      guardList,
      guardToUse.label,
      setGuardList
    );

    let mints = [];
    for (let nftMint of nftMintArr) {
      const fetchedNft = await fetchNft(umi, nftMint.publicKey, toast);
      if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
        mints.push({
          mint: nftMint.publicKey,
          offChainMetadata: fetchedNft.jsonMetadata,
        });
      }
    }

    setMintsCreated(mints);
    onOpen();
  } catch (e) {
    if (e instanceof Error) {
      console.error(`minting failed because of ${e.message}`);
    } else {
      console.error(`minting failed because of`, e);
    }

    toast({
      title: "Your mint failed!",
      description: "Please try again.",
      status: "error",
      duration: 6000,
      isClosable: true,
    });
  } finally {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = false;
    setGuardList(newGuardList);
    setCheckEligibility(true);
    updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
  }
}

export const MintButton = ({
  umi,
  guardList,
  candyMachine,
  candyGuard,
  ownedTokens = [], // provide default empty array
  toast,
  setGuardList,
  mintsCreated,
  setMintsCreated,
  onOpen,
  setCheckEligibility,
  setStatus,
  numNFTs = 1,
}: MintButtonProps) => {
  if (!candyMachine || !candyGuard) {
    return <></>;
  }

  /* Filter out duplicates - bug */
  let filteredGuardlist = guardList.filter(
    (elem, index, self) =>
      index === self.findIndex((t) => t.label === elem.label)
  );
  if (filteredGuardlist.length === 0) {
    return <></>;
  }
  // Guard "default" can only be used to mint in case no other guard exists
  if (filteredGuardlist.length > 1) {
    filteredGuardlist = guardList.filter((elem) => elem.label != "default");
  }

  /* At this point we're considering only default guard */
  let guard = filteredGuardlist[0];
  const text = mintText[0];
  const group = candyGuard.groups.find(
    (elem) => elem.label === guard.label
  );
  let startTime = createBigInt(0);
  let endTime = createBigInt(0);
  if (group) {
    if (group.guards.startDate.__option === "Some") {
      startTime = group.guards.startDate.value.date;
    }
    if (group.guards.endDate.__option === "Some") {
      endTime = group.guards.endDate.value.date;
    }
  }

  let buttonGuard: GuardButtonList = {
    label: "default",
    allowed: guard.allowed,
    header: text.header,
    mintText: text.mintText,
    buttonLabel: text.buttonLabel,
    startTime,
    endTime,
    tooltip: guard.reason
  };

  setStatus(buttonGuard.tooltip);

  return (
    <PrimaryButton
      w='65%'
      isDisabled={!buttonGuard.allowed}
      isLoading={
        guardList.find((elem) => elem.label === buttonGuard.label)?.minting
      }
      loadingText={
        guardList.find((elem) => elem.label === buttonGuard.label)?.loadingText
      }
      onClick={() =>
        mintClick(
          umi,
          buttonGuard,
          candyMachine,
          candyGuard,
          ownedTokens,
          toast,
          mintsCreated,
          setMintsCreated,
          guardList,
          setGuardList,
          onOpen,
          setCheckEligibility,
          numNFTs
        )
      }
    >
      {buttonGuard.buttonLabel}
    </PrimaryButton>
  );
};