// SPDX-License-Identifier: MIT
//SPDX-License-Identifier: <SPDX-License>
// pragma solidity ^0.8.4;

pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _collectionIds;

    struct CollectionInfo {
        uint256 id;
        string name;
        string collectionUri;
        uint256 totalMints;
        uint256 limits;
        uint256 price;
    }

    struct TokenInfo {
        uint256 tokenId;
        uint256 timestamp;
    }

    struct ListedToken {
        uint256 tokenId;
        address owner;
        uint256 price;
    }

    uint256 m_nMintPrice = 100000;
    uint256 m_nListPrice = 100000;
    uint256 m_nBuyingFee = 4;
    address public m_admcAddress = address(0x391F600e8c9003C1Cf0ecdc36E5B29f65Dd6C8Cc);
    address m_addrOwner; // developers
    mapping(uint256 => CollectionInfo) private m_mapCollection; // collection id --> CollectionInfo
    mapping(address => mapping(uint256 => TokenInfo[])) public m_mapOwnerTokens;
    mapping(uint256 => ListedToken[]) public m_mapMarketItem;
    mapping(uint256 => uint256) public m_nCollectionTokens;

    event CollectionCreated(
        uint256 indexed id,
        string name,
        string collectionUri,
        uint256 totalMints,
        uint256 limits,
        uint256 price
    );

    event TransferToken(
        address indexed owner,
        address indexed receiver,
        uint256 tokenId,
        uint256 collectionId
    );

    event Sold(
        address indexed owner,
        address indexed buyer,
        uint256 collection,
        uint256 tokenId,
        uint256 price
    );

    event Gift(
        address indexed owner,
        address indexed receiver,
        uint256 tokenId,
        uint256 collectionId
    );

    event MintingPriceChanged(uint256 _mintingPrice);

    constructor() ERC721("Adamant Character", "ADMCC") {
        m_addrOwner = msg.sender;
    }

    modifier onlyByOwner() {
        require(msg.sender == m_addrOwner, "Unauthorised Access");
        _;
    }

    function addCollection( string memory collectionName, string memory uri, uint256 totalMints, uint256 limits, uint256 price) public onlyByOwner {
        _collectionIds.increment();
        uint256 currentId = _collectionIds.current();
        m_mapCollection[currentId] = CollectionInfo(currentId, collectionName, uri, totalMints, limits, price);

        emit CollectionCreated(currentId, collectionName, uri, totalMints, limits, price);
    }

    function mintToken(uint256 collectionId) public returns (uint256) {
        IERC20 admc = IERC20(m_admcAddress);
        uint256 mintingPrice = m_mapCollection[collectionId].price * 10 ** 9;
        uint256 allowance = admc.allowance(msg.sender, address(this));
        require(m_addrOwner != msg.sender, "admin cant mint a nft item and create a market item.");
        require(allowance >= mintingPrice, "minting price is the smaller than allowed amount");
        require(admc.balanceOf(msg.sender) >= mintingPrice, "balance is too small, you can't pay for minting.");
        require(collectionId <= _collectionIds.current(), "The collection id no exists.");
        require(m_nCollectionTokens[collectionId] < m_mapCollection[collectionId].totalMints, "current minting count overflows total minting count.");
        require(m_mapOwnerTokens[msg.sender][collectionId].length < m_mapCollection[collectionId].limits, "Exceeded the limited number of minting.");

        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();

        _mint(msg.sender, currentTokenId);
        // _setTokenURI(currentTokenId, m_mapCollection[collectionId].collectionUri);

        m_mapOwnerTokens[msg.sender][collectionId].push(TokenInfo(currentTokenId, block.timestamp));
        m_nCollectionTokens[collectionId] += 1;

        admc.transferFrom(msg.sender, m_addrOwner, mintingPrice);

        return currentTokenId;
    }

    

    function getCollectionTokenCount(uint256 _collectionId) public view returns (uint256) {
        return m_nCollectionTokens[_collectionId];
    }

    function fetchCollections() public view returns (CollectionInfo[] memory) {
        uint256 count = _collectionIds.current();
        CollectionInfo[] memory info = new CollectionInfo[](count);
        for (uint256 i = 1; i <= count; i++) info[i - 1] = m_mapCollection[i];
        return info;
    }

    function fetchMyNFTS(uint256 _collectionId) public view returns (TokenInfo[] memory) {
        return m_mapOwnerTokens[msg.sender][_collectionId];
    }

    function getListedNFTs(uint256 _collectionId) public view returns (ListedToken[] memory) {
        return m_mapMarketItem[_collectionId];
    }

    function fetchMyListedNFTs(uint256 _collectionId) public view returns (ListedToken[] memory) {
        uint256 count = 0;
        for(uint256 i = 0; i < m_mapMarketItem[_collectionId].length; i++) {
            if(m_mapMarketItem[_collectionId][i].owner == msg.sender) {
                count++;
            }
        }
        ListedToken[] memory listedTokens = new ListedToken[](count);
        uint256 loop = 0;
        for(uint256 i = 0; i < m_mapMarketItem[_collectionId].length; i++) {
            if(m_mapMarketItem[_collectionId][i].owner == msg.sender) {
                listedTokens[loop] = m_mapMarketItem[_collectionId][i];
                loop++;
            }
        }
        return listedTokens;
    }

    function setMintingPrice(uint256 mintingPrice) public onlyByOwner {
        m_nMintPrice = mintingPrice;
        emit MintingPriceChanged(mintingPrice);
    }

    function getOwner() public view returns (address) {
        return m_addrOwner;
    }

    function getMintingPrice() public view returns (uint256) {
        return m_nMintPrice;
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    function getCurrentCollectionId() public view returns (uint256) {
        return _collectionIds.current();
    }

    function getCollectionInfo(uint256 collectionId) public view returns (string memory) {
        string memory json_str = "[";
        json_str = string(abi.encodePacked(json_str,
            "{\"name\":\"", m_mapCollection[collectionId].name,
            "\",\"tokenURI\":\"", m_mapCollection[collectionId].collectionUri,
            "\",\"totalMints\":\"", string(abi.encodePacked(m_mapCollection[collectionId].totalMints)),
            "\",\"limits\":\"", string(abi.encodePacked(m_mapCollection[collectionId].limits)),
            "\",\"price\":\"", string(abi.encodePacked(m_mapCollection[collectionId].price)),
            "\",\"currentMints\":\"", string(abi.encodePacked(m_nCollectionTokens[collectionId])),
            "\"}"));
        json_str = string(abi.encodePacked(json_str, "]"));
        return json_str;
    }

    function getCollectionInfoByCid(uint256 _collectionId) public view returns (CollectionInfo memory) {
        return m_mapCollection[_collectionId];
    }

    function getOwnerTokenCountForCollection(uint256 collectionId) public view returns (uint256) {
        return m_mapOwnerTokens[msg.sender][collectionId].length;
    }

    function setADMCAddress(address _addr) public onlyByOwner {
        m_admcAddress = _addr;
    }

    function getPayableCoin() public view returns (address) {
        return m_admcAddress;
    }

    function getURI(uint256 tokenId) public view returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function ownerOfToken(uint256 _tokenId) public view returns (address) {
        return ERC721.ownerOf(_tokenId);
    }

    function setListPrice(uint256 _price) public onlyByOwner {
        m_nListPrice = _price;
    }

    function getListPrice() public view returns (uint256) {
        return m_nListPrice;
    }

    function setBuyingFee(uint256 _fee) public onlyByOwner {
        m_nBuyingFee = _fee;
    }

    function getBuyingFee() public view returns(uint256) {
        return m_nBuyingFee;
    }

    function giftNFT(address _to, uint256 _tokenId, uint256 _collectionId) public {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        require(msg.sender == ownerOfToken(_tokenId), "Not permission for this action");
        require(_to != ownerOfToken(_tokenId), "You can't gift your NFT to you.");
        
        address owner = ownerOfToken(_tokenId);
        TokenInfo[] memory myNFTs = m_mapOwnerTokens[owner][_collectionId];
        uint256 timestamp;
        for (uint256 i = 0; i < myNFTs.length; i++) {
            if(myNFTs[i].tokenId == _tokenId) {
                timestamp = myNFTs[i].timestamp;
                break;
            }
        }
        uint256 times_diff = (block.timestamp - timestamp) / 3600;
        require(times_diff >= 24, "You can only gift your token after 24 hours since purchase.");

        ERC721.approve(_to, _tokenId);

        _transferFrom(_to, _tokenId, _collectionId);
    }

    function _transferFrom(address _to, uint256 _tokenId, uint256 _collectionId) private {
        address owner = ownerOfToken(_tokenId);

        TokenInfo[] memory myNFTs = m_mapOwnerTokens[owner][_collectionId];

        uint256 index = 0;
        for (uint256 i = 0; i < m_mapOwnerTokens[owner][_collectionId].length; i++) {
            if (m_mapOwnerTokens[owner][_collectionId][i].tokenId == _tokenId) {
                index = i;
                break;
            }
        }

        delete m_mapOwnerTokens[owner][_collectionId];

        for (uint256 j = 0; j < myNFTs.length; j++) {
            if (j != index) {
                m_mapOwnerTokens[owner][_collectionId].push(myNFTs[j]);
            }
        }

        removeFromMarketplace(_collectionId, _tokenId);

        ERC721.safeTransferFrom(owner, _to, _tokenId);
        emit TransferToken(owner, _to, _tokenId, _collectionId);

        m_mapOwnerTokens[_to][_collectionId].push(TokenInfo(_tokenId, block.timestamp));

        emit Gift(owner, _to, _tokenId, _collectionId);
    }

    function listToken(uint256 _collectionId, uint256 _tokenId, uint256 _price) public {
        address owner = ownerOfToken(_tokenId);
        require(msg.sender == owner, "You are not owner of this token");
        require(ERC20(m_admcAddress).balanceOf(msg.sender) >= m_nListPrice * 10 ** 9, "Inefficient ADMC funds");
        
        ERC721.approve(address(this), _tokenId);
        // ERC20(m_admcAddress).transferFrom(owner, address(this), m_nListPrice * 10 ** 9);

        m_mapMarketItem[_collectionId].push(ListedToken(_tokenId, owner, _price));
    }

    function cancelListing(uint256 _collectionId, uint256 _tokenId) public {
        address owner = ownerOfToken(_tokenId);
        require(msg.sender == owner, "You are not owner of this token");

        ERC721.approve(address(0), _tokenId);
        // IERC20(m_admcAddress).transfer(owner, m_nListPrice * 10 ** 9);

        removeFromMarketplace(_collectionId, _tokenId);
    }

    function removeFromMarketplace(uint256 collectionId, uint256 tokenId) private {
        uint256 index = 0;
        for(uint256 i = 1; i <= m_mapMarketItem[collectionId].length; i++) {
            if(m_mapMarketItem[collectionId][i - 1].tokenId == tokenId) {
                index = i;
                break;
            }
        }
        if(index != 0) {
            ListedToken[] memory listedTokens = m_mapMarketItem[collectionId];
            delete m_mapMarketItem[collectionId];
            for (uint256 j = 1; j <= listedTokens.length; j++) {
                if(j != index) {
                    m_mapMarketItem[collectionId].push(listedTokens[j - 1]);
                }
            }
        }
    }

    function buyNFT(uint256 _collectionId, uint256 _tokenId) public {
        address owner = ownerOfToken(_tokenId);
        require(msg.sender != owner, "You can't buy your NFT from marketplace");
        TokenInfo[] memory ownerNFTs = m_mapOwnerTokens[owner][_collectionId];

        for(uint256 i = 0; i < m_mapMarketItem[_collectionId].length; i++) {
            if(m_mapMarketItem[_collectionId][i].tokenId == _tokenId) {
                ListedToken memory listedToken = m_mapMarketItem[_collectionId][i];
                
                require(ERC20(m_admcAddress).balanceOf(msg.sender) >= listedToken.price * 10 ** 9, "Inefficient ADMC funds");

                ERC20(m_admcAddress).transferFrom(msg.sender, owner, listedToken.price * (100 - m_nBuyingFee) * 10 ** 7 );

                ERC20(m_admcAddress).transferFrom(msg.sender, m_addrOwner, listedToken.price * m_nBuyingFee * 10 ** 7);

                ERC20(m_admcAddress).transferFrom(owner, m_addrOwner, m_nListPrice * 10 ** 9);

                removeFromMarketplace(_collectionId, _tokenId);

                uint256 index = 0;
                for (uint256 j = 0; j < ownerNFTs.length; j++) {
                    if (ownerNFTs[j].tokenId == _tokenId) {
                        index = j;
                        break;
                    }
                }

                delete m_mapOwnerTokens[owner][_collectionId];

                for (uint256 k = 0; k < ownerNFTs.length; k++) {
                    if (k != index) {
                        m_mapOwnerTokens[owner][_collectionId].push(ownerNFTs[k]);
                    }
                }
                
                m_mapOwnerTokens[msg.sender][_collectionId].push(TokenInfo(_tokenId, block.timestamp));
                
                ERC721(address(this)).transferFrom(owner, msg.sender, _tokenId);

                emit TransferToken(owner, msg.sender, _tokenId, _collectionId);
                emit Sold(owner, msg.sender, _collectionId, _tokenId, listedToken.price);

                break;
            }
        }
    }
}
