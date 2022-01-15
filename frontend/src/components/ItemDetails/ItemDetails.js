import React, { Component } from 'react';
import { getContract } from '../../export/export';
import { BigNumber } from '@ethersproject/bignumber';
import { nftaddress } from '../../config';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import { withRouter } from 'react-router';
import CollectionDetail from '../AuthorProfile/CollectionDetail'

class ItemDetails extends Component {
    constructor(props) {
        super(props)
        this.state = {
            collectionData: {},
            tokenCount: 0,
            collectionId: ''
        }
    }

    componentDidMount() {
        this.setState({ collectionId: this.props.match.params.id })
        this.getCollectionInfo(this.props.match.params.id)
    }

    getCollectionInfo = async (id) => {
        const nftContract = await getContract(nftaddress, nftabi.abi)
        const collectionData = await nftContract.getCollectionInfoByCid(id)

        const tokenCount = await nftContract.getCollectionTokenCount(id)
        this.setState({
            collectionData: {
                name: collectionData.name,
                tokenURI: collectionData.collectionUri,
                mintPrice: parseInt(collectionData.price, 10),
                totalSupply: parseInt(collectionData.totalMints, 10),
                limits: parseInt(collectionData.limits, 10)
            },
            tokenCount: parseInt(tokenCount, 10)
        })
    }

    render() {
        return (
            <section className="item-details-area">
                <div className="container">
                    {
                        Object.keys(this.state.collectionData).length > 0 && (
                            <div className="row justify-content-between">
                                <div className="col-12 col-lg-5">
                                    <CollectionDetail tokenURI={this.state.collectionData.tokenURI} />
                                    {/* <div className="item-info">
                                        <div className="item-thumb text-center">
                                            <img src={this.state.collectionData.tokenURI} alt="" />
                                        </div>
                                    </div> */}
                                </div>
                                <div className="col-12 col-lg-6">
                                    <div className="content mt-5 mt-lg-0">
                                        <h3 className="m-0">{this.state.collectionData.name}</h3>
                                        {/* <p>{this.state.initData.content}</p> */}
                                        <div className="item-info-list mt-2">
                                            <ul className="list-unstyled">
                                                <li className="price d-flex justify-content-between">
                                                    <span>Mint Price: {this.state.collectionData.mintPrice} ADMC</span>
                                                </li>
                                                <li className="price d-flex justify-content-between">
                                                    <span>Total Mints: {this.state.collectionData.totalSupply}</span>
                                                </li>
                                                <li className="price d-flex justify-content-between">
                                                    <span>Owner limit amount: {this.state.collectionData.limits}</span>
                                                </li>
                                                <li className="price d-flex justify-content-between">
                                                    <span>NFT Item Count: {this.state.tokenCount}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </section>
        );
    }
}

export default withRouter(ItemDetails);