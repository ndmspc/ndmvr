import { Card, Button } from "@react-three/uikit-apfel";
import { Container, Text } from "@react-three/uikit";
import { ChevronDown , ChevronRight} from '@react-three/uikit-lucide'
import { useState } from "react";




function FileTree({ data, name }) {
  const [show, setShow] = useState(false);

  const isObject = typeof data === "object" && data !== null;

  return (


    <Container
      display="flex"
      flexDirection="column"
      height={"auto"}
    >

      {isObject ? (
        <Container
           height={"auto"}
           width={200}
          display="flex"
          flexDirection="column"
        >

          <Button
            borderRadius={5}
            height={25}
            platter onClick={() => setShow(!show)}

          >

            {show ? (
              <ChevronDown size={12} color="white" />
            ) : (
              <ChevronRight size={12} color="white" />
            )}
            <Text marginLeft={8}>{name}</Text>

          </Button>

          {show && (
            <Container

              width={200}
              height={"auto"}
              paddingLeft={40}
              display="flex"
              flexDirection="column"
            >
              {Object.entries(data).map(([key, value], idx) => (
                <FileTree key={idx} name={key} data={value} />
              ))}

             </Container>
          )
          }

        </Container>
      ) : (
        <Container

          width={500}
          height={"auto"}
          display="flex"
          flexDirection="column"


        >

          <Text
            whiteSpace="normal"
            wordWrap="break-word"
            wordBreak="break-all"
            overflow="hidden"
          >
            {name}: {String(data)}
          </Text>

        </Container>
      )}


    </Container>
    );
}

export default function TreeViewer( {data} ) {


  let obj;
  try {
    obj = typeof data === "string" ? JSON.parse(data) : data;
  } catch (e) {
    console.error("Invalid JSON:", e);
    obj = [];
  }

  return (
    <Card
      borderRadius={16}
       padding={16}


        width={500}
        height={400}
        overflow={"scroll"}
    >

      <Container
        gap={8}
        display="flex"
        flexDirection="column"
      >

        <FileTree data={obj} name={'Data:'} />

      </Container>

    </Card>

  );
}


