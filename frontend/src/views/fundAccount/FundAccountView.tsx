/* tslint:disable:no-implicit-dependencies */
import SpinnerBlack from "-!svg-react-loader?name=moneyIcon!../../assets/images/spin-black.svg";
import * as React from "react";
import {FormattedMessage} from "react-intl";
import {Redirect} from "react-router";
import {NAVIGATION} from "../../constants";
import {Commitment} from "../../models/Commitment";

import {config} from "../../config/config";

import {approveTransfer, createCommitment} from "../../services/DataService";
import {isAccountExist, isCorrectNetwork, isntEthereumBrowser} from "../../services/Web3Service";

import {Product} from "../../models/Products";

import {Web3AccountsStore} from "../../redux/store/web3AccountsStore";
import {Web3NetworkStore} from "../../redux/store/web3NetworkStore";
import {Web3Store} from "../../redux/store/web3Store";

import BalanceComponent from "../../components/fundAccount/balance/BalanceComponent";
import ConfirmationModalComponent from "../../components/fundAccount/confirmationModal/ConfirmationModalComponent";
import DownloadingBrowserComponent from "../../components/fundAccount/downloadingBrowser/DownloadingBrowserComponent";
import MakeCommitmentComponent from "../../components/fundAccount/makeCommitment/MakeCommitmentComponent";
import ObtaningTokensComponent from "../../components/fundAccount/obtaningTokens/ObtaningTokensComponent";
import StakeAktComponent from "../../components/fundAccount/stakeAkt/StakeAktComponent";
import ModalGlobalComponent from "../../components/modalGlobal/ModalGlobalComponent";

import {getStoredCommitment, isEmpty, storeCommitment} from "../../services/StorageService";
import "./v-fund-account.css";

import * as _ from "lodash";

/* tslint:enable:no-implicit-dependencies */

export interface Props {
    isPortfolio: boolean;
    product: Product | null;
    web3: Web3Store;
    web3Accounts: Web3AccountsStore;
    web3Network: Web3NetworkStore;
}

export interface PropsFromDispatch {
    commitmentCreated: (commitment: Commitment) => void;
    fetchAKTBalance: (account: string) => void;
    fetchETHBalance: (account: string) => void;
}

export interface StepOne {
    years: number;
    period: "week" | "month" | "quarter";
    rangeEth: number;
}

export interface StepTwo {
    stakeAkt: number;
    stakeAktValue: number;
}

interface State {
    AKTBalance: number;
    ETHBalance: number;
    isOpenModal: boolean;
    step: 1 | 2;
    stepOne: StepOne;
    stepTwo: StepTwo;
    showModal: boolean;
    waiting: boolean;
}

interface AllProps extends Props, PropsFromDispatch {
}

const TIMEOUT: number = 3000;

export default class FundAccountView extends React.Component<AllProps, State> {
    public readonly state: State = {
        AKTBalance: 0,
        ETHBalance: 0,
        isOpenModal: false,
        showModal: false,
        step: 1,
        stepOne: {
            period: "month",
            rangeEth: 0,
            years: 1,
        },
        stepTwo: {
            stakeAkt: 0,
            stakeAktValue: 0
        },
        waiting: false,
    };

    constructor(props: any) {
        super(props);

        this.handleOnClick = this.handleOnClick.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
    }

    public componentWillMount() {
        const account = this.props.web3Accounts.accountSelected;
        if (account) {
            this.props.fetchAKTBalance(account);
            this.props.fetchETHBalance(account);
        }
    }

    public componentWillReceiveProps(nextProps: Props) {
        const newState = {
            ...this.state,
            ...nextProps.web3,
        };
        if (!_.isEqual(this.state, newState)) {
            this.setState(newState);
        }
    }

    public render() {
        if (this.props.isPortfolio || !isEmpty(getStoredCommitment())) {
            return <Redirect to={`/${NAVIGATION.dashboard}`}/>;
        }

        return (
            <div className="v-fund-account">
                {this.state.step !== 2 &&
                <>
                    <BalanceComponent AKTBalance={this.state.AKTBalance} ETHBalance={this.state.ETHBalance}/>

                        {(isntEthereumBrowser() || !isAccountExist(this.props.web3Accounts)
                            || (config.network && !isCorrectNetwork(this.props.web3Network, config.network))) &&
                        <ModalGlobalComponent onClose={this.handleOnCloseModal} areBottomOptions={true}>
                            {isntEthereumBrowser() &&
                                    <DownloadingBrowserComponent />
                            }
                            {(!isntEthereumBrowser() && !isAccountExist(this.props.web3Accounts)) &&
                                <>
                                    <SpinnerBlack className="v-fund-account__icon" />
                                    <FormattedMessage id="web3.errorAccount.desc">
                                        {(desc: string) => (
                                            <h3 className="u-modal__headline" dangerouslySetInnerHTML={{ __html: desc }} />
                                        )}
                                    </FormattedMessage>
                                </>
                            }
                            {(!isntEthereumBrowser() && isAccountExist(this.props.web3Accounts) &&
                                (config.network && !isCorrectNetwork(this.props.web3Network, config.network))) &&
                            <>
                                <SpinnerBlack className="v-fund-account__icon" />
                                <FormattedMessage id="fundAccount.incorrectNetwork" values={{ network: config.network }}>
                                    {(desc: string) => (
                                        <p dangerouslySetInnerHTML={{ __html: desc }} />
                                    )}
                                </FormattedMessage>
                            </>
                            }
                        </ModalGlobalComponent>}
                    </>
                }

                {(this.state.AKTBalance === 0 || this.state.ETHBalance === 0) && (
                    <ObtaningTokensComponent AKTBalance={this.state.AKTBalance} ETHBalance={this.state.ETHBalance}
                                             account={this.props.web3Accounts.accountSelected}
                                             fetchAKTBalance={this.props.fetchAKTBalance}/>
                )}

                {(this.state.AKTBalance !== 0 && this.state.ETHBalance !== 0) && (
                    <>
                        {this.state.step === 1 ? (
                            <MakeCommitmentComponent AKTBalance={this.state.AKTBalance}
                                                     ETHBalance={this.state.ETHBalance}
                                                     form={this.state.stepOne}
                                                     onConfirm={this.handleStepOneConfirm}/>
                        ) : (
                            <StakeAktComponent onConfirm={this.handleStepTwoConfirm}
                                               form={this.state.stepTwo}
                                               back={this.handleBack}/>
                        )}
                        {this.state.showModal &&
                        <ModalGlobalComponent onClose={this.handleOnCloseModal}>
                            <ConfirmationModalComponent
                                resultStepOne={this.state.stepOne}
                                resultStepTwo={this.state.stepTwo}
                                isOpenProps={this.state.isOpenModal}
                                isWaiting={this.state.waiting}
                                onClick={this.handleOnClick}
                                onClose={this.handleOnCloseModal}/>
                        </ModalGlobalComponent>
                        }
                    </>
                )}
            </div>
        );
    }

    private handleOnClick = () => {
        const data = {...this.state.stepOne, ...this.state.stepTwo, ...this.props.product};
        this.setState({
            ...this.state,
            waiting: true,
        });
        if (data.stakeAktValue > 0) {
            approveTransfer(this.props.web3Accounts.accountSelected, data.stakeAktValue).then(() => {
                createCommitment(this.props.web3Accounts.accountSelected, data)
                    .then((commitment: any) => {
                        this.handleSuccess(commitment);
                    })
                    .catch((err) => {
                        this.setState({
                            ...this.state,
                            waiting: false,
                        });
                    });
            });
        } else {
            createCommitment(this.props.web3Accounts.accountSelected, data)
                .then((commitment: any) => {
                    this.handleSuccess(commitment);
                })
                .catch((err) => {
                    this.setState({
                        ...this.state,
                        waiting: false,
                    });
                });
        }
    }

    private handleSuccess(commitment: Commitment) {
        const fn = () => {
            this.setState({
                ...this.state,
                showModal: false,
                waiting: false,
            });
            storeCommitment(commitment);
            this.props.commitmentCreated(commitment);
        };
        setTimeout(fn, TIMEOUT);
    }

    private handleStepOneConfirm = (form: StepOne) => {
        this.setState({
            ...this.state,
            step: 2,
            stepOne: form,
        });
    }

    private handleStepTwoConfirm = (form: StepTwo) => {
        this.setState({
            ...this.state,
            showModal: true,
            stepTwo: form,
        });
        window.scrollTo(0, 0);
    }

    private handleBack = () => {
        this.setState({
            ...this.state,
            step: 1,
        });
    }

    private handleOnCloseModal = () => {
        this.setState({
            ...this.state,
            showModal: false
        });
    }
}