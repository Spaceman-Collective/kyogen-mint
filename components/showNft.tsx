import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@metaplex-foundation/umi";
import { Box, Text, Divider, SimpleGrid, VStack } from "@chakra-ui/react";
import React from 'react';
import styled from "@emotion/styled";

interface TraitProps {
    heading: string;
    description: string;
}

interface TraitsProps {
    metadata: JsonMetadata;
}
const Trait = ({ heading, description }: TraitProps) => {
    return (
        <Box background={"#D1C7A7"} borderRadius={"5px"} width={"120px"} minHeight={"50px"}>
            <VStack>
                <Text fontSize={"sm"}>{heading}</Text>
                <Text fontSize={"sm"} marginTop={"-2"} fontWeight={"semibold"}>{description}</Text>
            </VStack>
        </Box>

    );
};

const Traits = ({ metadata }: TraitsProps) => {
    if (metadata === undefined || metadata.attributes === undefined) {
        return <></>
    }

    //find all attributes with trait_type and value
    const traits = metadata.attributes.filter((a) => a.trait_type !== undefined && a.value !== undefined);
    //@ts-ignore
    const traitList = traits.map((t) => <Trait key={t.trait_type} heading={t.trait_type} description={t.value} />);

    return (
        <><Divider marginTop={"15px"} /><SimpleGrid marginTop={"15px"}>{traitList}</SimpleGrid></>);
};


interface CardProps {
    metadata: JsonMetadata;
    size?: string;
}

export default function Card({ metadata, size = 'md' }: CardProps) {
  // Get the images from the metadata if animation_url is present use this
 const sizeMap = new Map<string, string>([
    ['sm', '150px'],
    ['md', '300px'],
    ['lg', '400px'],
    ['xl', '600px']
  ]);

  const image = metadata.animation_url ?? metadata.image;
  return (
    <StyledBox width={sizeMap.get(size) ?? 'full'}>
      <Box
        key={image}
        height={"sm"}
        position="relative"
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        backgroundSize="cover"
        backgroundImage={`url(${image})`}
        borderRadius={"15px"}
      />
      <Text fontWeight={"semibold"} marginTop={"15px"}>
        {metadata.name}
      </Text>
      <Text>{metadata.description}</Text>
      <Traits metadata={metadata} />
    </StyledBox>
  );
}

const StyledBox = styled(Box)`
  padding: 1rem;
  border: 1px solid black;
  border-radius: 15px;
`

type Props = {
    size?: string;
    nft: { mint: PublicKey, offChainMetadata: JsonMetadata | undefined } | undefined;
};

export const ShowNft = ({ nft, size }: Props) => {
    if (nft === undefined) {
        return <></>
    }

    // get the last added nft
    const { mint, offChainMetadata } = nft;
    if (offChainMetadata === undefined) {
        return <></>
    }

    return (
        <Card metadata={offChainMetadata} key={mint} size={size} />
    );
}
