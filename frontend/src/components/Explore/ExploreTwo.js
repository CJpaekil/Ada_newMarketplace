import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { nftaddress, coinaddress } from '../../config';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import admcabi from "../../artifacts/contracts/Adamant.sol/Adamant.json";
import { getContract } from '../../export/export';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { BigNumber } from '@ethersproject/bignumber';
const BASE_URL = "https://my-json-server.typicode.com/themeland/netstorm-json/explore";
class SellAssetCmp extends Component {
    state = {
        data: {},
        exploreData: [],
        collectionItems: [],
        selectedCollection: {},
        nftItems: [],
        selectedToken: 0,
        startProgress: false,
        clicked: false,
        sortKey: 1
    }

    componentDidMount = async () => {
        this.onBuyNFT = this.onBuyNFT.bind(this);
        axios.get(`${BASE_URL}`)
            .then(res => {
                this.setState({
                    data: {},
                    exploreData: []
                })
            })
            .catch(err => console.log(err))
        await this.loadCollections();
    }

    loadCollections = async () => {
        const nftContract = await getContract(nftaddress, nftabi.abi)
        const collections = await nftContract.fetchCollections()
        let collectionData = []
        await Promise.all(collections.map(async (collection) => {
            const listedTokens = await nftContract.getListedNFTs(parseInt(collection.id))
            collectionData.push({
                collectionId: parseInt(collection.id),
                name: collection.name,
                tokenURI: collection.collectionUri,
                totalMints: parseInt(collection.totalMints),
                limits: parseInt(collection.limits),
                mintPrice: parseInt(collection.price),
                listNFTs: listedTokens.length > 0 ? listedTokens.map(nft => {
                    return {
                        tokenId: parseInt(nft.tokenId),
                        price: parseInt(nft.price)
                    }
                }) : []
            })
        }))
        this.setState({ collectionItems: collectionData })
    }

    onBuyNFT = async (itemInfo, idx) => {
        this.setState({
            startProgress: true,
            selectedToken: itemInfo.tokenId
        })
        try {
            const nftContract = await getContract(nftaddress, nftabi.abi)
            const admcContract = await getContract(coinaddress, admcabi.abi)

            const owner = await nftContract.ownerOfToken(this.state.selectedToken)
            const walletAddress = localStorage.getItem('select-address')
            if (String(owner).toLowerCase() === String(walletAddress).toLowerCase()) {
                this.setState({ startProgress: false })
                alert("You can't buy your NFT from marketplace")
                return;
            }

            let tx = await admcContract.approve(nftaddress, BigNumber.from(itemInfo.price).mul(BigNumber.from(Math.pow(10, 9))))
            await tx.wait()
            tx = await nftContract.buyNFT(this.state.selectedCollection.collectionId, itemInfo.tokenId)
            await tx.wait()

            window.location.href = "/sell-assets";
            return;

            const updatedItems = this.state.collectionItems.map(collection => collection.collectionId === this.state.selectedCollection.collectionId ? {
                collectionId: parseInt(collection.id),
                name: collection.name,
                tokenURI: collection.tokenURI,
                totalMints: parseInt(collection.totalMints),
                limits: parseInt(collection.limits),
                mintPrice: parseInt(collection.price),
                listNFTs: collection.listNFTs.splice(idx, 1)
            } : collection)
            console.log(">>>>>>>>>>>>>>>", updatedItems)
            this.setState({
                startProgress: false,
                collectionItems: updatedItems,
                // selectedCollection: {
                //     ...this.state.selectedCollection,
                //     listNFTs: this.state.selectedCollection.listNFTs.splice(idx, 1)
                // }
            })
            console.log("<<<<<<<<<<<<<<", this.state.selectedCollection)
        } catch (err) {
            this.setState({ startProgress: false })
            console.log(err)
            // alert(err.data.message)
        }
    }

    sleep = async (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    onCollectionItemClick = async (item) => {
        this.setState({
            selectedCollection: item,
            clicked: true
        })
    }

    render() {
        return (
            <section className="explore-area">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="intro d-flex justify-content-between align-items-end m-0">
                                <div className="intro-btn">
                                    <a className="btn content-btn" href="/sell-assets">{this.state.data.btnText}</a>
                                </div>
                                <div className="d-flex align-items-center color-white" style={{ color: 'black' }}>
                                    Sort:&nbsp; <select
                                        className="form-control sort-options"
                                        onChange={(e) => this.setState({ sortKey: e.target.value })}
                                    >
                                        <option value="1">ID (Lowest to Highest)</option>
                                        <option value="2">ID (Highest to Lowest)</option>
                                        <option value="3">Price (Lowest to Highest)</option>
                                        <option value="4">Price (Highest to Lowest)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row items">
                        {this.state.clicked == false ?
                            this.state.collectionItems.sort((a, b) => { return a.collectionId - b.collectionId })
                                .map((item, idx) => {
                                    return (
                                        <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                            <div className="card border-effect ap_anim cursor-pointer">
                                                <div className="image-over" onClick={() => this.onCollectionItemClick(item)}>
                                                    <img className="card-img-top d-block m-auto" src={item.tokenURI} alt="" />
                                                </div>
                                                <div className="card-caption col-12 p-0">
                                                    <div className="card-body">
                                                        <Link to={`/collection-details/${item.collectionId}`} className="d-flex justify-content-center">
                                                            <h5 className="mb-0">{item.name}</h5>
                                                        </Link>
                                                        <div className="seller align-items-center my-3 d-flex justify-content-center">
                                                            <span>{item.listNFTs.length} / {item.totalMints}</span>
                                                            <span style={{ marginLeft: "20px" }}> limits: {item.limits}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : this.state.selectedCollection.listNFTs
                                .sort((a, b) => {
                                    switch (parseInt(this.state.sortKey)) {
                                        case 1:
                                            return a.tokenId - b.tokenId;
                                            break;
                                        case 2:
                                            return b.tokenId - a.tokenId;
                                            break;
                                        case 3:
                                            return a.price - b.price;
                                            break;
                                        case 4:
                                            return b.price - a.price;
                                            break;
                                        default:
                                            return a.tokenId - b.tokenId;
                                            break;
                                    }
                                })
                                .map((item, idx) => {
                                    return (
                                        <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                            <div className="card border-effect ap_anim">
                                                <div className='d-flex justify-content-between align-items-center'>
                                                    <span>{this.state.selectedCollection.name}</span>
                                                    <span>#{item.tokenId}</span>
                                                </div>
                                                <div className="image-over my-2">
                                                    <img className="card-img-top d-block m-auto" src={this.state.selectedCollection.tokenURI} alt="" />
                                                </div>
                                                <div className="card-caption col-12 p-0">
                                                    <div className="card-body" style={{ padding: "7px" }}>
                                                        {(this.state.startProgress && this.state.selectedToken == item.tokenId) ?
                                                            <div className="col-12" style={{ display: 'flex', justifyContent: "center" }}>
                                                                <CircularProgress />
                                                            </div> : null
                                                        }
                                                        <div className="d-flex justify-content-center">
                                                            {item.price} ADMC
                                                        </div>
                                                        <div className="d-flex justify-content-center">
                                                            <Button
                                                                variant="contained"
                                                                className='mt-2'
                                                                style={{ width: "100px" }}
                                                                onClick={() => this.onBuyNFT(item, idx)}
                                                            >Buy</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                        }
                    </div>
                </div>
            </section>
        );
    }
}

export default SellAssetCmp;