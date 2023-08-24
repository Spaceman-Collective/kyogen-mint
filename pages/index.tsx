import Head from "next/head";
import { NavBar } from "@/components/nav";
import {
  PublicKey,
  publicKey,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import { guardChecker } from "../utils/checkAllowed";
import { Stack, useToast, Text, Skeleton, useDisclosure, Modal, ModalBody, ModalCloseButton, ModalContent, Image, ModalHeader, ModalOverlay, Box, VStack, Flex, HStack, Button, Input } from '@chakra-ui/react';
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { logo_svg } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import { useCandyMachine } from "@/hooks";
import { MainContainer } from "@/components/containers";

import { PrimaryButton, ShowDummyNftButton } from "@/components/buttons";
import { CoinflowModal } from "@/components/coinflow";
import { MintButton } from "@/components/buttons/MintButton.component";
import styled from "@emotion/styled";

export interface IsMinting {
  label: string;
  minting: boolean;
}

export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();

  const {
    isOpen: isShowNftOpen,
    onOpen: onShowNftOpen,
    onClose: onShowNftClose,
  } = useDisclosure();

  const {
    isOpen: isMintPaymentOpen,
    onOpen: onMintPaymentOpen,
    onClose: onMintPaymentClose,
  } = useDisclosure();

  const [mintsCreated, setMintsCreated] = useState<
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined
  >();

  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [numNFTs, setNumNFTs] = useState<number>(1);
  const [statusText, setStatusText] = useState<string | undefined>("");

  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false },
  ]);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);

  const useCoinflow =
    !!process.env.NEXT_PUBLIC_COINFLOW_MERCHANT_ID &&
    !!process.env.NEXT_PUBLIC_COINFLOW_ENV;

  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!");
    /*
    if (!toast.isActive('no-cm')) {
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
    }
    */
  }

  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      /*
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
      */
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { candyMachine, candyGuard } = useCandyMachine(
    umi,
    candyMachineId,
    checkEligibility,
    setCheckEligibility
  );

  useEffect(() => {
    const checkEligibility = async () => {
      if (candyMachine === undefined || !candyGuard || !checkEligibility) {
        return;
      }

      const { guardReturn, ownedTokens } = await guardChecker(
        umi,
        candyGuard,
        candyMachine,
        solanaTime
      );

      setOwnedTokens(ownedTokens);
      setGuards(guardReturn);
      setIsAllowed(false);

      let allowed = false;
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true;
          break;
        }
      }

      setIsAllowed(allowed);
      setLoading(false);
    };

    checkEligibility();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility]);

  return (
    <>
      <Head>
        <title>Kyogen mint</title>
        <meta name="description" content="Kyogen description" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <NavBar />

      <Box
        w="100vw"
        h="100vh"
        bgImage={"/assets/background.png"}
        bgSize="cover"
        bgPosition="center"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <MainContainer justifyContent="space-between" w="600px" h="600px">
          <Flex justifyContent="center">
            <Image
              rounded={"lg"}
              height={230}
              objectFit={"cover"}
              alt={"project Image"}
              src={logo_svg}
            />
          </Flex>

          {loading ? (
            <></>
          ) : (
            <Flex
              w="full"
              h="full"
              alignItems={"center"}
              justifyContent={"center"}
              flexDir={"column"}
            >
              <VStack>
                <Text fontSize={"sm"}>Available NFTs:</Text>
                <Text fontWeight={"semibold"}>
                  {Number(candyMachine?.itemsLoaded) -
                    Number(candyMachine?.itemsRedeemed)}
                  /{candyMachine?.itemsLoaded}
                </Text>
              </VStack>
              <HStack alignItems={"center"} gap="6">
                <StyledButton
                  img={"/assets/kyogen_minus.svg"}
                  size={"xs"}
                  onClick={(e) => {
                    if (numNFTs > 1) {
                      setNumNFTs(numNFTs - 1);
                    }
                  }}
                />
                <StyledInput
                  value={numNFTs}
                  w="95px"
                  h="50px"
                  onChange={(e) => setNumNFTs(Number(e.target.value))}
                ></StyledInput>
                <StyledButton
                  img={"/assets/kyogen_plus.svg"}
                  size={"xs"}
                  bgImage={"/assets/kyogen_plus.svg"}
                  onClick={() => setNumNFTs(numNFTs + 1)}
                />
              </HStack>
            </Flex>
          )}

          <Stack spacing="8">
            {loading ? (
              <div>
                <Skeleton height="300px" my="10px" />
              </div>
            ) : (
              <Flex w={'full'} flexDir={'column'} justifyContent={'center'} alignItems='center' gap='4'>
                <Text textAlign={'center'} fontFamily={"TitilliumWeb"} fontWeight={"bold"}>
                  {statusText}
                </Text>
                <MintButton
                  setStatus={setStatusText}
                  guardList={guards}
                  candyMachine={candyMachine}
                  candyGuard={candyGuard}
                  umi={umi}
                  ownedTokens={ownedTokens}
                  toast={toast}
                  setGuardList={setGuards}
                  mintsCreated={mintsCreated}
                  setMintsCreated={setMintsCreated}
                  onOpen={onShowNftOpen}
                  setCheckEligibility={setCheckEligibility}
                  numNFTs={numNFTs}
                />
              </Flex>
            )}
          </Stack>
        </MainContainer>

        {/* Enable this if you want to have a button that pops the modal with a hardcoded nft */}
        {/* <ShowDummyNftButton
          umi={umi}
          mintsCreated={mintsCreated}
          setMintsCreated={setMintsCreated}
          onShowNftOpen={onShowNftOpen}
        >
          Show NFT
        </ShowDummyNftButton> */}

        <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
          <ModalOverlay />
          <ModalContent bg="transparent">
            <MainContainer w="full">
              <ModalHeader>Your minted NFT:</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <ShowNft nfts={mintsCreated} />
              </ModalBody>
            </MainContainer>
          </ModalContent>
        </Modal>

        {useCoinflow && (
          <Modal isOpen={isMintPaymentOpen} onClose={onMintPaymentClose}>
            <ModalOverlay />
            <ModalContent pt="20" maxW="900px" bg="transparent">
              <Flex justifyContent="space-around" gap="2px" alignItems="center">
                <MainContainer
                  justifyContent="space-between"
                  w="410px"
                  h="520px"
                >
                  <Text>Your wallet</Text>
                  <PrimaryButton onClick={onMintPaymentOpen}>
                    Mint
                  </PrimaryButton>
                </MainContainer>
                <MainContainer
                  justifyContent="space-between"
                  w="410px"
                  h="520px"
                >
                  <Text>Coinflow</Text>

                  <CoinflowModal />

                  <PrimaryButton onClick={onMintPaymentOpen}>
                    Proceed to checkout
                  </PrimaryButton>
                </MainContainer>
              </Flex>
            </ModalContent>
          </Modal>
        )}
      </Box>
    </>
  );
}

const StyledButton = styled(Button)<{ img?: string }>`
  background-color: transparent;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  background-image: ${(props) => `url(${props.img ? props.img : ''})`};
  transition: transform 0.2s ease-in-out;

  &:hover {
    background-image: ${(props) => `url(${props.img ? props.img : ''})`};
    background-position: center;
    background-color: transparent;

    transform: scale(1.1);
  }
`

const StyledInput = styled(Input)`
  background-color: white;
  border-radius: 10px;
  border: 3px solid black;
  font-family: 'TitilliumWeb', sans-serif;
  font-weight: 600;

  :hover {
    border: 3px solid black;
  }
`
