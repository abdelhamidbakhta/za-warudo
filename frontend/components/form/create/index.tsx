import {
  Box,
  Button,
  Input,
  useToast,
  Text,
  useColorModeValue,
  FormLabel,
  Checkbox,
} from "@chakra-ui/react";
import { useAccount } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { CreateRangeProps, CreateStream } from "../../../types";
import e from "cors";
import {
  create_with_duration,
  handleCreateStream,
} from "../../../hooks/lockup/handleCreateStream";
import { ADDRESS_LENGTH } from "../../../constants";
import {
  DEFAULT_NETWORK,
  CONTRACT_DEPLOYED_STARKNET,
} from "../../../constants/address";

import ERC20Tokei from "../../../constants/abi/tokei_ERC20.contract_class.json";
import {
  Contract,
  Uint,
  Uint256,
  stark,
  uint256,
  BigNumberish,
  cairo,
} from "starknet";

interface ICreateStream {}

enum StreamTypeCreation {
  CREATE_WITH_DURATION = "CREATE_WITH_DURATION",
  CREATE_WITH_RANGE = "CREATE_WITH_RANGE",
}

const CreateStreamForm = ({}: ICreateStream) => {
  const toast = useToast();
  const accountStarknet = useAccount();
  const account = accountStarknet?.account;
  const address = accountStarknet?.account?.address;
  const [isDisabled, setIsDisabled] = useState<boolean>(true);
  const [typeStreamCreaiton, setTypeStreamCreation] = useState<
    StreamTypeCreation | undefined
  >();
  const [recipient, setRecipient] = useState<boolean>(true);
  // const [form, setForm] = useState<CreateRangeProps | undefined>({
  //   sender: account?.address,
  //   recipient: undefined,
  //   total_amount: undefined,
  //   asset: undefined,
  //   cancelable: undefined,
  //   range: {
  //     start: undefined,
  //     cliff: undefined,
  //     end: undefined,
  //   },
  //   broker: {
  //     account: undefined,
  //     fee: undefined,
  //   },
  // });
  const [form, setForm] = useState<CreateStream | undefined>({
    sender: account?.address,
    recipient: undefined,
    total_amount: undefined,
    asset: undefined,
    cancelable: false,
    transferable: false,
    range: {
      start: undefined,
      cliff: undefined,
      end: undefined,
    },
    broker: {
      account: undefined,
      fee: undefined,
    },
    duration_cliff: undefined,
    duration_total: undefined,
    broker_account: account?.address,
    broker_fee: undefined,
    broker_fee_nb: undefined,
  });
  useEffect(() => {
    if (address && account) {
      setIsDisabled(false);
      setForm({ ...form, sender: address });
    }
  }, [accountStarknet, account, address]);

  const prepareHandleCreateStream = async (
    typeOfCreation: StreamTypeCreation
  ) => {
    const CONTRACT_ADDRESS = CONTRACT_DEPLOYED_STARKNET[DEFAULT_NETWORK];

    if (!CONTRACT_ADDRESS.lockupLinearFactory?.toString()) {
      toast({
        title: `Contract Lockup linear is not deployed in ${DEFAULT_NETWORK}.`,
        isClosable: true,
        duration: 1500,
      });
      return;
    }

    /** Check value before send tx */

    if (!address) {
      toast({
        title: "Connect your account",
        status: "warning",
        isClosable: true,
        duration: 1000,
      });
      return;
    }

    if (!form?.sender) {
      toast({
        status: "warning",
        isClosable: true,
        duration: 1000,
      });
      return {
        isSuccess: false,
        message: "Connect your account",
      };
    }

    if (!form?.total_amount) {
      toast({
        title: "Provide Total amount to lockup",
        status: "warning",
        isClosable: true,
        duration: 1000,
      });
      return;
    }

    /** Address verification */

    if (!form?.asset?.length) {
      toast({
        title: "Asset not provided",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    /***@TODO use starknet check utils isAddress */
    if (form?.asset?.length < ADDRESS_LENGTH) {
      toast({
        title: "Asset is not address size. Please verify your ERC20 address",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    if (!form?.recipient) {
      toast({
        title: "Recipient not provided",
        status: "warning",
        isClosable: true,
      });
      return;
    }
    /***@TODO use starknet check utils isAddress */

    if (
      form?.recipient?.length != ADDRESS_LENGTH ||
      cairo.isTypeContractAddress(form?.recipient)
    ) {
      toast({
        title:
          "Recipient is not address size. Please verify your recipient address",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    if (!form?.broker?.fee) {
      toast({
        title: "No fees provided",
        status: "warning",
      });
      return;
    }

    if (!form?.broker?.account) {
      toast({
        title: "No broker account provided",
        status: "warning",
      });
      return;
    }

    const erc20Contract = new Contract(ERC20Tokei.abi, form?.asset, account);

    let decimals=18;

    try {
      decimals == (await erc20Contract.decimals());
    } catch (e) {
    } finally {
    }
    const total_amount_nb =
      form?.total_amount * (10 ** Number(decimals));

    if (typeOfCreation == StreamTypeCreation.CREATE_WITH_DURATION) {
      let total_amount;

      if(Number.isInteger(total_amount_nb)) {
        total_amount = cairo.uint256(total_amount_nb);
      }

      else if(!Number.isInteger(total_amount_nb)) {
        total_amount=total_amount_nb
        // total_amount = uint256.bnToUint256(BigInt(total_amount_nb));
      }

      if (!form?.duration_cliff) {
        toast({
          title: "Please provide End date",
          status: "warning",
        });
        return;
      }

      if (!form?.duration_total) {
        toast({
          title: "Please provide End date",
          status: "warning",
        });
        return;
      }

      if (!form?.broker_account) {
        toast({
          title: "Please provide broker account",
          status: "warning",
        });
        return;
      }

      if (cairo.isTypeContractAddress(form?.broker_account)) {
        toast({
          title: "Please provide a valid Address for your broker account",
          status: "warning",
        });
        return;
      }

      if (form?.duration_total < form?.duration_cliff) {
        toast({
          title: "Duration total need to be superior too duration_cliff",
          status: "error",
        });
        return;
      }

      if (!account?.address) {
        toast({
          title: "Duration total need to be superior too duration_cliff",
          status: "error",
        });
        return;
      }

      const { tx, isSuccess, message } = await create_with_duration(
        accountStarknet?.account,
        account?.address, //Sender
        form?.recipient, //Recipient
        total_amount_nb, // Total amount
        // BigInt(total_amount_nb), // Total amount
        // total_amount_nb, // Total amount

        form?.asset, // Asset
        form?.cancelable, // Asset
        form?.transferable, // Transferable
        form?.duration_cliff,
        form?.duration_total,
        form?.broker_account,
        form?.broker_fee
        // form?.broker_fee_nb
      );

      console.log("message", message);
    } else {
      if (!form?.range.start) {
        toast({
          title: "Provide Start date",
          status: "warning",
        });
        return {};
      }

      if (!form?.range.end) {
        toast({
          title: "Please provide End date",
          status: "warning",
        });
        return;
      }

      if (!form?.range.cliff) {
        toast({
          title: "Please provide Cliff",
          status: "warning",
        });
        return;
      }

      const { tx, isSuccess, message } = await handleCreateStream({
        form: form,
        address: address,
        accountStarknet: accountStarknet,
      });
    }
  };

  return (
    <Box
      width={{ base: "100%" }}
      py={{ base: "1em", md: "2em" }}
      px={{ base: "1em" }}
    >
      <Text fontFamily={"PressStart2P"} fontSize={{ base: "19px", md: "21px" }}>
        Start creating your lockup linear vesting
      </Text>

      <Box
        py={{ base: "1em", md: "2em" }}
        display={{ md: "flex" }}
        height={"100%"}
        justifyContent={"space-around"}
        // gridTemplateColumns={'1fr 1fr'}
        gap={{ base: "0.5em", md: "1em" }}
        alignContent={"baseline"}
        alignSelf={"self-end"}
        alignItems={"baseline"}
      >
        <Box height={"100%"} display={"grid"}>
          <Text textAlign={"left"} fontFamily={"PressStart2P"}>
            Basic details
          </Text>

          <Input
            my={{ base: "0.25em", md: "0.5em" }}
            py={{ base: "0.5em" }}
            type="number"
            placeholder="Total amount"
            onChange={(e) => {
              setForm({ ...form, total_amount: Number(e.target.value) });
            }}
          ></Input>

          <Input
            // my='1em'
            my={{ base: "0.25em", md: "0.5em" }}
            py={{ base: "0.5em" }}
            onChange={(e) => {
              setForm({ ...form, asset: e.target.value });
            }}
            placeholder="Asset address"
          ></Input>

          <Input
            // my='1em'
            my={{ base: "0.25em", md: "0.5em" }}
            py={{ base: "0.5em" }}
            onChange={(e) => {
              setForm({ ...form, recipient: e.target.value });
            }}
            placeholder="Recipient"
          ></Input>

          <Box height={"100%"}>
            <Box>
              <Text textAlign={"left"}>Account</Text>
              <Input
                my={{ base: "0.25em", md: "0.5em" }}
                py={{ base: "0.5em" }}
                aria-valuetext={form?.broker?.account}
                onChange={(e) => {
                  setForm({
                    ...form,
                    broker_account: e.target.value,
                    sender: e.target.value,
                    broker: {
                      ...form.broker,
                      account: e.target.value,
                    },
                  });
                }}
                placeholder="Broker account address"
              ></Input>
              <Input
                py={{ base: "0.5em" }}
                type="number"
                my={{ base: "0.25em", md: "0.5em" }}
                onChange={(e) => {
                  setForm({
                    ...form,
                    // broker_fee: uint256.bnToUint256(Number(e?.target?.value)),
                    // broker_fee: cairo.uint256(Number(e?.target?.value)),
                    broker_fee: cairo.uint256(Number(e?.target?.value)),
                    broker_fee_nb: Number(e?.target?.value),

                    broker: {
                      ...form.broker,
                      fee: Number(e.target.value),
                    },
                  });
                }}
                placeholder="Fee broker"
              ></Input>

              <Text>Cancelable</Text>
              <Checkbox
                py={{ base: "0.5em" }}
                type="number"
                my={{ base: "0.25em", md: "0.5em" }}
                onClick={(e) => {
                  if (form?.cancelable) {
                    setForm({
                      ...form,
                      cancelable: false,
                    });
                  } else {
                    setForm({
                      ...form,
                      cancelable: true,
                    });
                  }
                }}
                placeholder="Fee broker"
              ></Checkbox>
            </Box>
          </Box>
        </Box>
        <Box
          // display={{ md: "flex" }}
          height={"100%"}
          gap={{ base: "0.5em" }}
          w={{ base: "100%", md: "fit-content" }}
        >
          <Text textAlign={"left"} fontFamily={"PressStart2P"}>
            Range date ⏳
          </Text>
          <Box
            height={"100%"}
            w={{ base: "100%", md: "450px" }}
            bg={useColorModeValue("gray.900", "gray.700")}
            p={{ base: "1em" }}
            borderRadius={{ base: "5px" }}
          >
            <Text
              textAlign={"left"}
              color={useColorModeValue("gray.100", "gray.300")}
            >
              Start date
            </Text>
            <Input
              justifyContent={"start"}
              w={"100%"}
              py={{ base: "0.5em" }}
              my={{ base: "0.25em", md: "0.5em" }}
              type="datetime-local"
              color={useColorModeValue("gray.100", "gray.300")}
              _placeholder={{
                color: useColorModeValue("gray.100", "gray.300"),
              }}
              onChange={(e) => {
                setForm({
                  ...form,
                  range: {
                    ...form.range,
                    start: new Date(e.target.value).getTime(),
                  },
                });
              }}
              placeholder="Start date"
            ></Input>

            <Text
              textAlign={"left"}
              color={useColorModeValue("gray.100", "gray.300")}
            >
              Cliff date
            </Text>
            <Input
              py={{ base: "0.5em" }}
              my={{ base: "0.25em", md: "0.5em" }}
              type="number"
              placeholder="Cliff"
              color={useColorModeValue("gray.100", "gray.300")}
              _placeholder={{
                color: useColorModeValue("gray.100", "gray.300"),
              }}
              onChange={(e) => {
                setForm({
                  ...form,
                  range: {
                    ...form.range,
                    cliff: Number(e.target.value),
                  },
                });
              }}
            ></Input>

            <Text
              textAlign={"left"}
              color={useColorModeValue("gray.100", "gray.300")}
            >
              End date
            </Text>
            <Input
              py={{ base: "0.5em" }}
              type="datetime-local"
              my={{ base: "0.25em", md: "0.5em" }}
              color={useColorModeValue("gray.100", "gray.300")}
              _placeholder={{
                color: useColorModeValue("gray.100", "gray.300"),
              }}
              onChange={(e) => {
                setForm({
                  ...form,
                  range: {
                    ...form.range,
                    end: new Date(e.target.value).getTime(),
                  },
                });
              }}
              placeholder="End date"
            ></Input>

            <FormLabel fontFamily={"monospace"}>
              Duration stream type:{" "}
            </FormLabel>

            <Text
              textAlign={"left"}
              color={useColorModeValue("gray.100", "gray.300")}
            >
              Duration cliff
            </Text>
            <Input
              py={{ base: "0.5em" }}
              type="number"
              my={{ base: "0.25em", md: "0.5em" }}
              color={useColorModeValue("gray.100", "gray.300")}
              _placeholder={{
                color: useColorModeValue("gray.100", "gray.300"),
              }}
              onChange={(e) => {
                setForm({
                  ...form,
                  duration_cliff: Number(e?.target?.value),
                });
              }}
              placeholder="Duration cliff"
            ></Input>

            <Text
              textAlign={"left"}
              color={useColorModeValue("gray.100", "gray.300")}
            >
              Duration total
            </Text>
            <Input
              py={{ base: "0.5em" }}
              type="number"
              my={{ base: "0.25em", md: "0.5em" }}
              color={useColorModeValue("gray.100", "gray.300")}
              _placeholder={{
                color: useColorModeValue("gray.100", "gray.300"),
              }}
              onChange={(e) => {
                setForm({
                  ...form,
                  duration_total: Number(e?.target?.value),
                });
              }}
              placeholder="Duration total"
            ></Input>
          </Box>
        </Box>
      </Box>

      <Box>
        <Text>Choose your type of stream to create</Text>

        <Box
          textAlign={"center"}
          display={{ base: "flex" }}
          gap={{ base: "0.5em" }}
        >
          <Button
            bg={useColorModeValue("brand.primary", "brand.primary")}
            disabled={isDisabled}
            onClick={() => {
              prepareHandleCreateStream(
                StreamTypeCreation.CREATE_WITH_DURATION
              );
            }}
          >
            Create duration stream ⏳
          </Button>
          {/* 
          <Button
            bg={useColorModeValue("brand.primary", "brand.primary")}
            disabled={isDisabled}
            onClick={() => {
              prepareHandleCreateStream(StreamTypeCreation.CREATE_WITH_RANGE);
            }}
          >
            Create stream
          </Button> */}
        </Box>
      </Box>
    </Box>
  );
};

export default CreateStreamForm;
