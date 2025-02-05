import * as React from "react";

const {useCallback, useEffect, useState, useImperativeHandle} = React;
import {Arrow} from "../Arrow/Arrow";
import styles from "./Carousel.module.scss";
import {CarouselItem} from "./CarouselItem/CarouselItem";
import {DotsNavigation} from "./DotsNavigation/DotsNavigation";
import {useSwipeable} from "react-swipeable";

const animationTime = 500; //ms

function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

type CarouselProps = {
    arrows: boolean;
    dotsNavigation: boolean;
    dotsNavigationInside?: boolean;
    dotNavigationOutlineColor?: string;
    dotNavigationFillColor?: string;
    children?: React.ReactNode;
    width: string;
    height: string;
    autoScrollInterval?: number;
    autoScrollClickDelay?: number;
    carouselStyle?: "flat" | "3d";
    outOfFocusDarken?: boolean;
};

export type CarouselControllerHandle = {
    shiftLeft: () => void;
    shiftRight: () => void;
    jumpToIndex: (index: number) => void;
};

const Carousel = React.forwardRef<CarouselControllerHandle, CarouselProps>(
    (props: CarouselProps, ref) => {
        // State
        let [prevItemStyle, setPrevItemStyle] = useState(` ${styles["prev"]}`);
        let [doublePrevItemStyle, setDoublePrevItemStyle] = useState(` ${styles["doublePrev"]}`);
        let [nextItemStyle, setNextItemStyle] = useState(` ${styles["next"]}`);
        let [doubleNextItemStyle, setDoubleNextItemStyle] = useState(` ${styles["doubleNext"]}`);
        let [showItems, setShowItems] = useState<React.ReactNode>();
        const [showingIndex, setShowingIndex] = useState(0);

        const childrenCount = React.Children.count(props.children);

        const [waiting, setWaiting] = useState(false);
        const [autoScrollClickDelay, setAutoScrollClickDelay] = useState(false);

        const showItemsNum = React.Children.count(showItems) ?? 0;
        const is3D = props.carouselStyle === "3d";

        let prevIndex = showingIndex === 0 ? showItemsNum - 1 : showingIndex - 1;
        let doublePrevIndex = showingIndex === 0 ? showItemsNum - 2 : (showingIndex === 1 ? showItemsNum - 1 : showingIndex - 2)
        let nextIndex = showingIndex === showItemsNum - 1 ? 0 : showingIndex + 1;
        let doubleNextIndex = showingIndex === showItemsNum - 1 ? 1 : (showingIndex === showItemsNum - 2 ? 0 : showingIndex + 2);

        // Controller
        useImperativeHandle(ref, () => {
            return {
                shiftLeft: () => shiftLeft(),
                shiftRight: () => shiftRight(),
                jumpToIndex: (index: number) => jumpToIndexHandler(index),
            };
        });

        useEffect(() => {
            let items = React.Children.map(props.children, (child, index) => {
                if (child) return child;
            });
            if (childrenCount <= 5) items = items?.concat(items);
            setShowItems(items);
            setShowingIndex((prev) => {
                if (prev >= showItemsNum) return showItemsNum - 1;
                else if (prev < 0) return 0;
                else return prev;
            });
        }, [props.children, showItemsNum]);

        // Render the carousel elements based on its setup
        const renderElement = (listItem: React.ReactNode, index: number) => {
            let style = `${styles["itemContainer"]}`;
            style += is3D ? ` ${styles["threed"]}` : ` ${styles["flat"]}`;
            let isSelected = index === showingIndex;
            let onClickHandler;
            if (isSelected) style += ` ${styles["showing"]}`;
            else if (index === prevIndex) {
                style += prevItemStyle;
                // onClickHandler = () => clickHandler("L");
            } else if (index === nextIndex) {
                style += nextItemStyle;
                // onClickHandler = () => clickHandler("R");
            } else if (index === doublePrevIndex) {
                style += doublePrevItemStyle;
            } else if (index == doubleNextIndex) {
                style += doubleNextItemStyle;
            }
            return (
                <div className={style} key={index}>
                    <CarouselItem
                        isShowing={isSelected}
                        height={props.height}
                        outOfFocusDarken={props.outOfFocusDarken ?? true}
                    >
                        {listItem}
                    </CarouselItem>
                </div>
            );
        };

        // Swipeable handlers
        const handlers = useSwipeable({
            onSwipedRight: () => {
                clickHandler("L");
            },
            onSwipedLeft: () => {
                clickHandler("R");
            },
            preventScrollOnSwipe: true,
        });

        // Shifts the carousel left
        const shiftLeft = useCallback(() => {
            setShowingIndex((prev) => {
                if (prev === 0 || prev - 1 > showItemsNum - 1 || prev - 1 < 0) {
                    return showItemsNum - 1;
                }
                return prev - 1;
            });
        }, [showItemsNum]);

        // Shifts the carousel right
        const shiftRight = useCallback(() => {
            setShowingIndex((prev) => {
                if (
                    prev === showItemsNum - 1 ||
                    prev + 1 > showItemsNum - 1 ||
                    prev + 1 < 0
                ) {
                    return 0;
                }
                return prev + 1;
            });
        }, [showItemsNum]);

        // Checks if currently waiting, if not - adjust the CSS styles and call carousel shift
        const rotateCarouselHandler = useCallback(
            (arg0: "L" | "R") => {
                if (waiting === false) {
                    setWaiting(true);
                    switch (arg0) {
                        case "L":
                            setPrevItemStyle(` ${styles["prev"]} ${styles["leftClick"]}`);
                            setDoublePrevItemStyle(` ${styles["doublePrev"]} ${styles["leftClick"]}`);
                            setNextItemStyle(` ${styles["next"]} ${styles["leftClick"]}`);
                            setDoubleNextItemStyle(` ${styles["doubleNext"]} ${styles["leftClick"]}`);
                            shiftLeft();
                            break;
                        case "R":
                            setPrevItemStyle(` ${styles["prev"]}`);
                            setDoublePrevItemStyle(` ${styles["doublePrev"]}`);
                            setNextItemStyle(` ${styles["next"]}`);
                            setDoubleNextItemStyle(` ${styles["doubleNext"]}`);
                            shiftRight();
                            break;
                    }
                }
            },
            [shiftLeft, shiftRight, waiting]
        );

        // Configures auto-rotate interval
        useEffect(() => {
            if (
                autoScrollClickDelay === false &&
                props.autoScrollInterval &&
                props.autoScrollInterval > animationTime
            ) {
                let interval = setInterval(() => {
                    rotateCarouselHandler("R");
                }, props.autoScrollInterval);

                return () => clearInterval(interval);
            }
        }, [autoScrollClickDelay, props.autoScrollInterval, rotateCarouselHandler]);

        // Configures auto-rotate delay after click
        useEffect(() => {
            const stopWaiting = async () => {
                if (props.autoScrollClickDelay !== undefined) {
                    await delay(props.autoScrollClickDelay);
                    setAutoScrollClickDelay((prev) => {
                        return false;
                    });
                }
            };
            if (autoScrollClickDelay === true) stopWaiting();
        }, [autoScrollClickDelay, props.autoScrollClickDelay]);

        // Takes care of waiting for an action
        useEffect(() => {
            const stopWaiting = async () => {
                await delay(animationTime);
                setWaiting((prev) => {
                    return false;
                });
            };
            if (waiting === true) stopWaiting();
        }, [waiting]);

        // Takes in the item index to jump to, calls rotateCarouselHandler
        const jumpToIndexHandler = (index: number) => {
            if (waiting === false) {
                setWaiting(true);
                if (index === prevIndex) {
                    rotateCarouselHandler("L");
                } else if (index === nextIndex) {
                    rotateCarouselHandler("R");
                } else {
                    setShowingIndex(index);
                }
                setAutoScrollClickDelay(true);
            }
        };

        // Arrow click handler
        const clickHandler = (dir: "L" | "R") => {
            rotateCarouselHandler(dir);
            setAutoScrollClickDelay(true);
        };

        return (
            <>
                <div
                    style={{
                        width: props.width,
                        height: props.height,
                        position: "relative",
                    }}
                >
                    <div className={styles.verticalContainer}>
                        <div className={styles.horizontalContainer}>
                            {props.arrows && (
                                <button
                                    onClick={() => {
                                        clickHandler("L");
                                    }}
                                    className={
                                        is3D
                                            ? `${styles["arrowButtonContainer"]} ${styles["threed"]} ${styles["left"]}`
                                            : `${styles["arrowButtonContainer"]} ${styles["flat"]}  ${styles["left"]}`
                                    }
                                >
                                </button>
                            )}
                            <div className={styles.swipeContainer} {...handlers}>
                                {showItems &&
                                React.Children.map(showItems, (listItem, index) => {
                                    return renderElement(listItem, index);
                                })}
                            </div>
                            {props.arrows && (
                                <button
                                    className={
                                        is3D
                                            ? `${styles["arrowButtonContainer"]} ${styles["threed"]} ${styles["right"]}`
                                            : `${styles["arrowButtonContainer"]} ${styles["flat"]}  ${styles["right"]}`
                                    }
                                    onClick={() => clickHandler("R")}
                                >
                                </button>
                            )}
                        </div>
                    </div>
                    {props.dotsNavigation && (
                        <div
                            className={
                                props.dotsNavigationInside
                                    ? `${styles["navContainer"]} ${styles["inside"]}`
                                    : `${styles["navContainer"]}`
                            }
                        >
                            <DotsNavigation
                                items={
                                    childrenCount === 2
                                        ? React.Children.map(showItems, (el, index) => {
                                        if (index < 2) return el;
                                    }) ?? []
                                        : showItems ?? []
                                }
                                selectedIndex={showingIndex % childrenCount}
                                jumpToIndex={jumpToIndexHandler}
                                dotNavigationOutlineColor={
                                    props.dotNavigationOutlineColor ?? "rgb(220,220,220,1)"
                                }
                                dotNavigationFillColor={
                                    props.dotNavigationFillColor ?? "rgb(220,220,220,1)"
                                }
                            />
                        </div>
                    )}
                </div>
            </>
        );
    }
);

export default Carousel;
