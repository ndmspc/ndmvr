import {Children, useState} from "react";
import styled from "styled-components";

const TabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
`;

const TabsHeader = styled.div`
    display: flex;
    flex-direction: row;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    height: 48px;
    flex-shrink: 0;
`;

const TabButton = styled.button`
    background: none;
    border: none;
    padding: 0 24px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    color: ${({$active}) => ($active ? "#000" : "#666")};
    font-weight: ${({$active}) => ($active ? "600" : "400")};
    outline: none;
    display: flex;
    align-items: center;

    &:hover {
        background-color: #ebebeb;
        color: #333;
    }

    &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${({$active}) => ($active ? "2px" : "0")};
        background-color: #007bff;
        transition: height 0.2s ease;
    }

    @media (max-width: 768px) {
        padding: 0 16px;
        font-size: 14px;
    }
`;

const TabsContent = styled.div`
    flex: 1;
    overflow: auto;
    padding: 24px;
    background-color: #fff;

    @media (max-width: 768px) {
        padding: 16px;
    }
`;

export function Tabs({children}) {
    const [activeIndex, setActiveIndex] = useState(0);

    const tabs = Children.toArray(children);

    return (
        <TabsContainer>
            <TabsHeader>
                {tabs.map((tab, index) => (
                    <TabButton
                        key={index}
                        $active={index === activeIndex}
                        onClick={() => setActiveIndex(index)}
                    >
                        {tab.props.name}
                    </TabButton>
                ))}
            </TabsHeader>

            <TabsContent>
                {tabs.map((tab, index) => (
                    <div
                        key={index}
                        style={{
                            display: index === activeIndex ? "block" : "none",
                            height: "100%",
                            width: "100%",
                        }}
                    >
                        {tab}
                    </div>
                ))}
            </TabsContent>
        </TabsContainer>
    );
}
