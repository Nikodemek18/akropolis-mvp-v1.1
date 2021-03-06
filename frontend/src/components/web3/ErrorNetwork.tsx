import * as React from "react";
import {FormattedMessage} from "react-intl";

import {config} from "../../config/config";

import "./c-web3.css";

const getText = (neededNetwork: string) => (
    <div className="c-web3__error">
        <h1 className="c-web3__error-title"><FormattedMessage id="web3.errorNetwork.title" /></h1>
        <p className="c-web3__error-message"><FormattedMessage id="web3.errorNetwork.desc" values={{network: neededNetwork}} /></p>
    </div>
);

const ErrorNetwork = () => {
    const network = config.network;
    return getText(network);
};

export default ErrorNetwork;
