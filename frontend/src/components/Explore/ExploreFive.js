import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import { nftaddress, coinaddress } from '../../config';
import admcabi from "../../artifacts/contracts/Adamant.sol/Adamant.json";
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import { getContract } from '../../export/export';
import { BigNumber } from '@ethersproject/bignumber';

class ExploreFive extends Component {

    constructor(props) {
        super(props);

        this.onGiftNFT = this.onGiftNFT.bind(this)
        this.onListNFT = this.onListNFT.bind(this)
        this.onCancelListing = this.onCancelListing.bind(this)

        this.closeRef = React.createRef()

        this.state = {
            initData: {},
            data: [],
            collectionItems: [],
            inputValue: 0,
            selectedCollection: '',
            selectedToken: 0,
            startProgress: false,
            clicked: false,
            open: true,
            addrToGift: '',
            index: 0,
            sortKey: 1
        }
    }

    componentDidMount = () => {
        this.loadCollections();
    }

    loadCollections = async () => {
        const nftContract = await getContract(nftaddress, nftabi.abi);
        const collections = await nftContract.fetchCollections()
        let collectionData = []
        await Promise.all(collections.map(async (collection) => {
            const myNFTs = await nftContract.fetchMyNFTS(parseInt(collection.id))
            const myListNFTs = await nftContract.fetchMyListedNFTs(parseInt(collection.id))
            collectionData.push({
                collectionId: parseInt(collection.id),
                name: collection.name,
                tokenURI: collection.collectionUri,
                totalMints: parseInt(collection.totalMints),
                limits: parseInt(collection.limits),
                mintPrice: parseInt(collection.price),
                listNFTs: myListNFTs.length > 0 ? myListNFTs.map(nft => {
                    return {
                        tokenId: parseInt(nft.tokenId),
                        price: parseInt(nft.price)
                    }
                }) : [],
                tokenIds: myNFTs.length > 0 ? myNFTs.map(nft => {
                    return {
                        id: parseInt(nft.tokenId),
                        purchase_date: parseInt(nft.timestamp, 10),
                        listPrice: myListNFTs.length > 0 ?
                            (myListNFTs.filter(nft1 => parseInt(nft1.tokenId) === parseInt(nft.tokenId)).length > 0 ?
                                myListNFTs.filter(nft1 => parseInt(nft1.tokenId) === parseInt(nft.tokenId))[0].price : 0)
                            : 0
                    }
                }) : []
            })
        }))
        this.setState({ collectionItems: collectionData })
    }

    onListNFT = async (tokenId) => {
        if (this.state.inputValue === '' || this.state.inputValue === 0) {
            alert("Please input your sell price")
            return;
        }
        try {
            this.setState({
                startProgress: true,
                selectedToken: tokenId
            })
            const walletAddress = localStorage.getItem('select-address')
            const admcContract = await getContract(coinaddress, admcabi.abi)
            const nftContract = await getContract(nftaddress, nftabi.abi)
            const listFee = await nftContract.getListPrice()

            const allowance = await admcContract.allowance(walletAddress, nftaddress)
            console.log("allowance: ", parseInt(allowance))

            let tx = await admcContract.approve(nftaddress,
                BigNumber.from(allowance).add(BigNumber.from(listFee).mul(BigNumber.from(Math.pow(10, 9))))
            )
            await tx.wait()
            tx = await nftContract.listToken(this.state.selectedCollection.collectionId, tokenId, this.state.inputValue)
            await tx.wait()

            // window.location.href = "/my-assets";
            // return;
            if (this.state.collectionItems.filter(col => col.collectionId === this.state.selectedCollection.collectionId).length > 0) {
                const updatedObj = this.state.collectionItems
                    .map(col => col.collectionId === this.state.selectedCollection.collectionId ?
                        {
                            collectionId: parseInt(col.collectionId),
                            name: col.name,
                            tokenURI: col.tokenURI,
                            totalMints: parseInt(col.totalMints),
                            limits: parseInt(col.limits),
                            mintPrice: parseInt(col.mintPrice),
                            listNFTs: [...col.listNFTs, {
                                tokenId: tokenId,
                                price: this.state.inputValue
                            }],
                            tokenIds: col.tokenIds
                        } : col
                    )
                this.setState({
                    inputValue: '',
                    startProgress: false,
                    collectionItems: updatedObj,
                    selectedCollection: {
                        ...this.state.selectedCollection,
                        listNFTs: [...this.state.selectedCollection.listNFTs, {
                            tokenId: tokenId,
                            price: this.state.inputValue
                        }]
                    }
                })
            }
        } catch (err) {
            this.setState({
                inputValue: '',
                startProgress: false
            })
            console.log(err)
            // alert(err.data.message)
        }
    }

    onCancelListing = async (tokenId) => {
        try {
            this.setState({
                selectedToken: tokenId,
                startProgress: true
            })
            const walletAddress = localStorage.getItem('select-address')
            const admcContract = await getContract(coinaddress, admcabi.abi)
            const nftContract = await getContract(nftaddress, nftabi.abi)
            const listFee = await nftContract.getListPrice()

            const allowance = await admcContract.allowance(walletAddress, nftaddress)
            console.log(parseInt(allowance))
            if (allowance >= listFee) {
                const tx1 = await admcContract.approve(nftaddress, BigNumber.from(allowance).sub(BigNumber.from(listFee).mul(BigNumber.from(Math.pow(10, 9)))))
                await tx1.wait()
                const tx = await nftContract.cancelListing(this.state.selectedCollection.collectionId, tokenId)
                await tx.wait()

                await this.loadCollections()
                this.setState({
                    startProgress: false,
                    selectedCollection: this.state.collectionItems.filter(col => col.collectionId === this.state.selectedCollection.collectionId)[0]
                })
            } else {
                alert("Allowance is not correct")
            }
        } catch (err) {
            this.setState({
                selectedToken: '',
                startProgress: false
            })
            console.log(err)
            // alert(err.data.message)
        }
    }

    sleep = async (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    onGiftNFT = async () => {
        if (this.state.addrToGift === "") {
            alert("Please input address to gift your NFT")
            return;
        }
        const timestamp = this.state.selectedCollection.tokenIds.filter(token => token.id === this.state.selectedToken)[0].purchase_date
        const current_timestamp = new Date().getTime()
        const diff = Number((current_timestamp - timestamp * 1000) / 3600000).toFixed(0)
        if (diff < 24) {
            alert("You can only gift your token after 24 hours since purchase.");
            return;
        }
        this.closeRef.current.click()
        this.setState({
            startProgress: true
        })
        try {
            const walletAddress = localStorage.getItem('select-address')
            const address = this.state.addrToGift
            const nftContract = await getContract(nftaddress, nftabi.abi);
            if (this.state.selectedCollection.listNFTs.filter(nft => nft.tokenId === this.state.selectedToken).length > 0) {
                const listFee = await nftContract.getListPrice()
                const admcContract = await getContract(coinaddress, admcabi.abi)
                const allowance = await admcContract.allowance(walletAddress, nftaddress)
                if (allowance >= listFee) {
                    const tx1 = await admcContract.approve(nftaddress, BigNumber.from(allowance).sub(BigNumber.from(listFee).mul(BigNumber.from(Math.pow(10, 9)))))
                    await tx1.wait()
                }
            }
            const tx = await nftContract.giftNFT(address, this.state.selectedToken, this.state.selectedCollection.collectionId)
            await tx.wait()

            await this.loadCollections()
            this.setState({
                addrToGift: '',
                startProgress: false,
                open: false,
                selectedCollection: this.state.collectionItems.filter(col => col.collectionId === this.state.selectedCollection.collectionId)[0]
            })
        } catch (err) {
            console.log(err)
            // alert(err.data.message)
        }
    }

    render() {
        return (
            <section className="explore-area">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="intro d-flex justify-content-between align-items-center m-0">
                                <div className="intro-btn">
                                    <a className="btn content-btn" href="/my-assets">{this.state.data.btnText}</a>
                                </div>
                                <div className="d-flex align-items-center color-white" style={{color: 'black'}}>
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
                        {
                            this.state.clicked === false ?
                                this.state.collectionItems.sort((a, b) => { return a.collectionId - b.collectionId })
                                    .map((item, idx) => {
                                        return (
                                            <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                                <div className="card border-effect ap_anim cursor-pointer">
                                                    <div className="image-over" onClick={() => {
                                                        this.setState({ clicked: true, selectedCollection: item })
                                                    }}>
                                                        <img className="card-img-top d-block m-auto" src={item.tokenURI} alt="" />
                                                    </div>
                                                    <div className="card-caption col-12 p-0">
                                                        <div className="card-body">
                                                            <Link to={`/collection-details/${item.collectionId}`} className="d-flex justify-content-center">
                                                                <h5 className="mb-0">{item.name}</h5>
                                                            </Link>
                                                            <div className="seller align-items-center my-3 d-flex justify-content-center">
                                                                <h3>{item.tokenIds.length}</h3>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) :
                                <>
                                    {
                                        this.state.collectionItems.filter(col => col.collectionId === this.state.selectedCollection.collectionId)[0].tokenIds
                                            .sort((a, b) => {
                                                switch (parseInt(this.state.sortKey)) {
                                                    case 1:
                                                        return a.id - b.id;
                                                        break;
                                                    case 2:
                                                        return b.id - a.id;
                                                        break;
                                                    case 3:
                                                        return a.listPrice - b.listPrice;
                                                        break;
                                                    case 4:
                                                        return b.listPrice - a.listPrice;
                                                        break;
                                                    default:
                                                        return a.id - b.id;
                                                        break;
                                                }
                                                
                                            })
                                            .map((tokenId, idx) => {
                                                return (
                                                    <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                                        <div className="card border-effect ap_anim cursor-pointer p-3">
                                                            <div className='px-2 my-2 d-flex justify-content-between align-items-center'>
                                                                <span>{this.state.selectedCollection.name}</span>
                                                                <span>#{tokenId.id}</span>
                                                            </div>
                                                            <div className="image-over">
                                                                <img className="card-img-top m-auto d-block" src={this.state.selectedCollection.tokenURI} alt="" />
                                                            </div>
                                                            <div className="card-caption col-12 p-0">
                                                                <div className="card-body px-2 pt-0">
                                                                    {(this.state.startProgress && this.state.selectedToken === tokenId.id) && (
                                                                        <div className="col-12 d-flex justify-content-center">
                                                                            <CircularProgress />
                                                                        </div>
                                                                    )}
                                                                    {
                                                                        this.state.selectedCollection.listNFTs.filter(nft => parseInt(nft.tokenId) === tokenId.id).length > 0 ? (
                                                                            <>
                                                                                <div className='d-flex justify-content-center py-3'>
                                                                                    {this.state.selectedCollection.listNFTs.filter(nft => parseInt(nft.tokenId) === tokenId.id)[0].price}&nbsp;ADMC
                                                                                </div>
                                                                                <div className="mt-2 d-flex justify-content-between align-items-center">
                                                                                    <Button variant="contained" name="listing-price" onClick={() => this.onCancelListing(tokenId.id)}>Cancel</Button>
                                                                                    <Button variant="contained" name="nft-gift" data-toggle="modal" data-target="#exampleModal" onClick={() => {
                                                                                        this.setState({
                                                                                            open: true,
                                                                                            selectedToken: tokenId.id,
                                                                                            addrToGift: ""
                                                                                        })
                                                                                    }}>Gift</Button>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className='d-flex justify-content-center my-3'>
                                                                                    <input type="text" className="form-control" placeholder="Unit: ADMC" required="required" onChange={(e) => this.setState({ inputValue: parseInt(e.target.value) })} />
                                                                                </div>
                                                                                <div className="mt-2 d-flex justify-content-between align-items-center">
                                                                                    <Button variant="contained" name="listing-price" onClick={() => this.onListNFT(tokenId.id)}>List</Button>
                                                                                    <Button variant="contained" name="nft-gift" data-toggle="modal" data-target="#exampleModal" onClick={() => {
                                                                                        this.setState({
                                                                                            open: true,
                                                                                            selectedToken: tokenId.id,
                                                                                            index: idx,
                                                                                            addrToGift: ""
                                                                                        })
                                                                                    }}>Gift</Button>
                                                                                </div>
                                                                            </>
                                                                        )
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    }
                                </>
                        }
                    </div>
                </div>
                <div id="exampleModal" className="modal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                    <div className="modal-dialog">
                        <div className="modal-content background-white">
                            <div className="modal-header py-3 px-4 border-bottom">
                                <h5 className="modal-title my-0 color-black">Gift NFT</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={() => this.setState({ open: false, addrToGift: '' })}>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body py-2 px-4">
                                <div style={{ width: '100%' }}>
                                    <div className="form-group">
                                        <h6 id="transition-modal-title" className='color-black'>Please input address to gift your NFT</h6>
                                        <input
                                            type="text"
                                            className="form-control col-md-12"
                                            style={{ width: '100% !important' }}
                                            value={this.state.addrToGift}
                                            onChange={(e) => this.setState({ addrToGift: e.target.value })}
                                            placeholder='Enter address'
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-2 px-4">
                                <Button type="button" variant='text' className="py-2 px-3" data-dismiss="modal" ref={this.closeRef} onClick={() => this.setState({ open: false, addrToGift: '' })}>Close</Button>
                                <Button type="button" variant='contained' className="py-2 px-3" onClick={this.onGiftNFT.bind(this)}>Gift</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}

export default ExploreFive;