const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const cops = [3,5,17,22,44,45,47,56,65,75,88,99,113,117,143,146,154,173,176,211,230,233,236,254,260,263,284,310,311,338,370,373,389,390,391,402,418,430,446,475,504,521,525,532,561,562,576,579,625,643,648,654,657,671,672,684,690,695,700,705,706,718,720,735,737,738,742,748,753,754,766,767,786,788,794,804,811,816,825,831,847,848,882,887,898,920,937,938,946,963,966,968,972,987];

describe("ThugCity Testing", function () {
  
  // Fixture at state of game start
  async function startGame() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();
    // Deploys NFT contract
    const NFT = await hre.ethers.getContractFactory("ThugCityNFT");
    const nft = await NFT.deploy();
    await nft.deployed();

    // Deploys BILLS contract
    const BILLS = await hre.ethers.getContractFactory("Bills");
    const bills = await BILLS.deploy();
    await bills.deployed()
  
    // Deploys Assets contract
    const ASSETS = await hre.ethers.getContractFactory("Assets");
    const assets = await ASSETS.deploy();
    await assets.deployed()
    
    // Deploys City contract with other addresses as parameters
    const CITY = await hre.ethers.getContractFactory("City");
    const city = await CITY.deploy(nft.address, bills.address, assets.address);
    await city.deployed()
  
    // Adds city as manager of NFT
    const setNFT = await nft.addManager(city.address);
    await setNFT.wait();

    // Sets cost to 0 (for ease of testing)
    const setPrice = await nft.setCost(0);
    await setPrice.wait();

    // Maps cops (only out of first 1000 characters)
    const mapCops = await nft.setCopIds(cops);
    await mapCops.wait();

    // Sets whitelist only to false
    const setWhitelist = await nft.setWhitelistOnly(false);
    await setWhitelist.wait();

    // Mints 15 NFTs to account 2
    const mintNFTS = await nft.mint(otherAccount.address, 15);
    await mintNFTS.wait();
  
    // Adds city as manager for BILLS
    const setBILLS = await bills.addManager(city.address);
    await setBILLS.wait();

    // Adds owner as manager for BILLS
    const setOwnerBILLS = await bills.addManager(owner.address);
    await setOwnerBILLS.wait();
    
    // Sets ThugCity as City in Assets contract
    const setAssets = await assets.setThugCity(city.address);
    await setAssets.wait();

    // Starts game
    const startCity = await city.startGame();
    await startCity.wait();

    return { nft, bills, assets, city, owner, otherAccount };

  }

  // Fixture after depositing 100,000 $BILLS
  async function deposit() {
    const { nft, bills, assets, city, otherAccount } = await loadFixture(startGame);
    // Mints 100,000 BILLS to otherAccount
    const mintBILLS = await bills.mint(otherAccount.address, ethers.utils.parseEther((100000).toString()));
    await mintBILLS.wait();
    const deposit = await city.connect(otherAccount).depositBills(otherAccount.address, ethers.utils.parseEther((100000).toString()));
    await deposit.wait();
  
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking 15 NFTS (2 cops)
  async function stakeNFTs() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(startGame);
    const nftsOwned = await nft.walletOfOwner(otherAccount.address);
    const stakeNFTs = await city.connect(otherAccount).addManyToCity(otherAccount.address, nftsOwned);
    await stakeNFTs.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking 15 NFTs (2 cops) and depositing 100,000 $BILLS
  async function stakeAndDeposit() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(startGame);
    const nftsOwned = await nft.walletOfOwner(otherAccount.address);
    const stakeNFTs = await city.connect(otherAccount).addManyToCity(otherAccount.address, nftsOwned);
    await stakeNFTs.wait();
    const mintBILLS = await bills.mint(otherAccount.address, ethers.utils.parseEther((100000).toString()));
    await mintBILLS.wait();
    const deposit = await city.connect(otherAccount).depositBills(otherAccount.address, ethers.utils.parseEther((100000).toString()));
    await deposit.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking 15 NFTs (2 cops) and waiting 1.3 days to accumulate bills
  async function stakeAndWait() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(startGame);
    const nftsOwned = await nft.walletOfOwner(otherAccount.address);
    const stakeNFTs = await city.connect(otherAccount).addManyToCity(otherAccount.address, nftsOwned);
    await stakeNFTs.wait();
    // Move time ahead by 1.3 days (exact time for 15 NFTs (2 cops) to earn 20,000 $BILLS, enough for 3 guns and bank robbery)
    await network.provider.send("evm_increaseTime", [112500]);
    await network.provider.send("evm_mine");
    return { nft, assets, bills, city, otherAccount };
  }

  async function ownsGunsWaited() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(stakeAndWait);
    const gunPurchase0 = await city.connect(otherAccount).buyGun(0, 4);
    await gunPurchase0.wait();
    const gunPurchase5 = await city.connect(otherAccount).buyGun(5, 4);
    await gunPurchase5.wait();
    const gunPurchase3 = await city.connect(otherAccount).buyGun(3, 4);
    await gunPurchase3.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after purchasing max guns for Thug 0, Cop 3 and Cop 5
  async function ownsGuns() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(stakeAndDeposit);
    const gunPurchase0 = await city.connect(otherAccount).buyGun(0, 4);
    await gunPurchase0.wait();
    const gunPurchase5 = await city.connect(otherAccount).buyGun(5, 4);
    await gunPurchase5.wait();
    const gunPurchase3 = await city.connect(otherAccount).buyGun(3, 4);
    await gunPurchase3.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at dealership (5% success chance)
  async function allCopsAtDealership() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 1);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 1);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at prison (5% success chance)
  async function allCopsAtPrison() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 2);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 2);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at casino (5% success chance)
  async function allCopsAtCasino() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 3);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 3);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at bank (5% success chance)
  async function allCopsAtBank() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 4);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 4);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at dealership (5% success chance) - duplicate for error in testing
  async function allCopsAtDealership2() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 1);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 1);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at prison (5% success chance) - duplicate for error in testing
  async function allCopsAtPrison2() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 2);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 2);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at casino (5% success chance) - duplicate for error in testing
  async function allCopsAtCasino2() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 3);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 3);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Fixture after staking all Cops at bank (5% success chance) - duplicate for error in testing
  async function allCopsAtBank2() {
    const { nft, assets, bills, city, otherAccount } = await loadFixture(ownsGuns);
    const moveCop = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 3, 4);
    await moveCop.wait();
    const moveCop2 = await city.connect(otherAccount).stakeCopAtLocation(otherAccount.address, 5, 4);
    await moveCop2.wait();
    return { nft, assets, bills, city, otherAccount };
  }

  // Tests deployment of all contracts and ensures they have permissions to one another
  describe("Deployment", function () {
    describe("City", function () {
      it("Should set contract addresses in city contract", async function () {
        const { nft, bills, assets, city } = await loadFixture(startGame);
        expect(await city.citizen()).to.equal(nft.address);
        expect(await city.bills()).to.equal(bills.address);
        expect(await city.assets()).to.equal(assets.address);
      });
      it("Should be unpaused and set lastBlockTimestamp", async function () {
        const { city } = await loadFixture(startGame);
        expect(await city.paused()).to.equal(false);
        expect(await city.lastBlockTimestamp).to.not.equal(0);
      });
    });
    describe("NFT", function () {
      it("Should set city as manager for NFT", async function () {
        const { nft, city } = await loadFixture(startGame);
        expect(await nft.managers(city.address)).to.equal(true);
      });
      it("Should map all cops", async function () {
        const { nft, city } = await loadFixture(startGame);
        for(let i = 0; i < cops.length; i++){
          expect(await nft.isCop(cops[i])).to.equal(true);
        }
      });
      it("Should set whitelist only to false", async function () {
        const { nft, city } = await loadFixture(startGame);
        expect(await nft.whitelistOnly()).to.equal(false);
      });
      it("Should set cost to 0", async function () {
        const { nft } = await loadFixture(startGame);
        expect(await nft.cost()).to.equal(0);
      });
      it("Should mint 15 NFTs to account 2", async function () {
        const { nft, otherAccount } = await loadFixture(startGame);
        expect(await nft.balanceOf(otherAccount.address)).to.equal(15);
      });
    });
    describe("BILLS", function () {
      it("Should set city as manager for BILLS", async function () {
        const { bills, city } = await loadFixture(startGame);
        expect(await bills.managers(city.address)).to.equal(true);
      });
    });
    describe("Assets", function () {
      it("Should set ThugCity in assets to city", async function () {
        const { assets, city } = await loadFixture(startGame);
        expect(await assets.thugCity()).to.equal(city.address);
      });
    });
  });

  // Testing staking many characters and unstaking with and without withdrawing
  describe("Staking/Unstaking", function () {
    describe("Staking", function () {
      it("Should stake 15 NFTs in City", async function () {
        const { city } = await loadFixture(stakeNFTs);
        let cops = await city.totalCopsStaked();
        expect(await city.totalThugsStaked()).to.equal(15 - cops);
      });
    });
    describe("Unstaking (no withdraw)", function () {
      it("Should unstake 15 NFTs from City", async function () {
        const { nft, city, otherAccount } = await loadFixture(stakeNFTs);
        const copsStaked = await city.getUserStakedCops(otherAccount.address);
        const thugsStaked = await city.getUserStakedThugs(otherAccount.address);
        const charsStaked = copsStaked.concat(thugsStaked);
        const unstakeNFTs = await city.connect(otherAccount).unstakeManyFromCity(charsStaked, false);
        await unstakeNFTs.wait();
        expect(await nft.balanceOf(otherAccount.address)).to.equal(15);
        expect(await city.totalCopsStaked()).to.equal(0);
        expect(await city.totalThugsStaked()).to.equal(0);
      });
    });
    describe("Unstaking (withdraw)", function () {
      it("Should unstake 15 NFTs from City (with $BILLS)", async function () {
        const { nft, bills, city, otherAccount } = await loadFixture(stakeNFTs);
        const copsStaked = await city.getUserStakedCops(otherAccount.address);
        const thugsStaked = await city.getUserStakedThugs(otherAccount.address);
        const charsStaked = copsStaked.concat(thugsStaked);
        const unstakeNFTs = await city.connect(otherAccount).unstakeManyFromCity(charsStaked, true);
        await unstakeNFTs.wait();
        expect(await nft.balanceOf(otherAccount.address)).to.equal(15);
        expect(await city.totalCopsStaked()).to.equal(0);
        expect(await city.totalThugsStaked()).to.equal(0);
        expect(await bills.balanceOf(otherAccount.address)).to.be.greaterThan(0);
      });
    });
  });

  // Testing deposit and withdraw functions
  describe("Depositing/Withdrawing", function () {
    describe("Depositing", function () {
      it("Should deposit 100,000 $BILLS", async function () {
        const { city, bills, otherAccount } = await loadFixture(deposit);
        expect(await city.getUserBalance(otherAccount.address)).to.equal(ethers.utils.parseEther((100000).toString()));
        expect(await bills.balanceOf(otherAccount.address)).to.equal(0);
      });
    });
    describe("Withdrawing", function () {
      it("Should withdraw 100,000 $BILLS", async function () {
        const { city, bills, otherAccount } = await loadFixture(deposit);
        const withdraw = await city.connect(otherAccount).withdrawAll(otherAccount.address);
        await withdraw.wait();
        expect(await city.getUserBalance(otherAccount.address)).to.equal(0);
        expect(await bills.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseEther((100000).toString()));
      });
    });
  });

  // Testing buying each tier of weapon (with deposited funds)
  describe("Purchasing Weapons with deposited funds", function () {
    describe("Buying class 1 Weapon", function () {
      it("Should reward character with class 1 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndDeposit);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 1);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(1);
      });
    });
    describe("Buying class 2 Weapon", function () {
      it("Should reward character with class 2 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndDeposit);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 2);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(2);
      });
    });
    describe("Buying class 3 Weapon", function () {
      it("Should reward character with class 3 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndDeposit);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 3);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(3);
      });
    });
    describe("Buying class 4 Weapon", function () {
      it("Should reward character with class 4 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndDeposit);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 4);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(4);
      });
    });
  });

  // Testing committing crimes with chance set to 100
  describe("Committing Crimes (100% chance) with deposited funds", function () {
    describe("Stealing car from dealership", function () {
      it("Should win sportscar or supercar", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGuns);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 1);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.sportsCars) + Number(inventory.superCars)).to.equal(1);
      });
    });
    describe("Breaking out of prison", function () {
      it("Should win street thug or thug leader", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGuns);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 2);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.streetThugs) + Number(inventory.gangLeaders)).to.equal(1);
      });
    });
    describe("Robbing casino", function () {
      it("Should win chips or stack or vault", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGuns);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 3);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.chips) + Number(inventory.chipStacks)).to.equal(1);
      });
    });
    describe("Robbing bank", function () {
      it("Should win cash or cash bag", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGuns);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 4);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.cashBag) + Number(inventory.cash)).to.equal(1);
      });
    });
  });

  // Testing crimes after moving all Cops staked to a location
  describe("Committing Crimes (0% chance) with deposited funds", function () {
    describe("Stealing car from dealership", function () {
      it("Should not win reward, Cops both receive 1 medallion", async function () {
        const { city, assets, otherAccount } = await loadFixture(allCopsAtDealership2);
        const settingChance = await city.setChance(0);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 1);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.sportsCars) + Number(inventory.superCars)).to.equal(0);
        expect(await city.getAllUnclaimedMedallions(otherAccount.address)).to.equal(2);
      });
    });
    describe("Breaking out of prison", function () {
      it("Should not win reward, Cops both receive 2 medallions", async function () {
        const { city, assets, otherAccount } = await loadFixture(allCopsAtPrison2);
        const settingChance = await city.setChance(0);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 2);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.streetThugs) + Number(inventory.gangLeaders)).to.equal(0);
        expect(await city.getAllUnclaimedMedallions(otherAccount.address)).to.equal(4);
      });
    });
    describe("Robbing casino", function () {
      it("Should not win reward, Cops both receive 3 medallions", async function () {
        const { city, assets, otherAccount } = await loadFixture(allCopsAtCasino2);
        const settingChance = await city.setChance(0);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 3);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.chips) + Number(inventory.chipStacks)).to.equal(0);
        expect(await city.getAllUnclaimedMedallions(otherAccount.address)).to.equal(6);
      });
    });
    describe("Robbing bank", function () {
      it("Should not win reward, Cops both receive 4 medallions", async function () {
        const { city, assets, otherAccount } = await loadFixture(allCopsAtBank2);
        const settingChance = await city.setChance(0);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 4);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.cashBag) + Number(inventory.cash)).to.equal(0);
        expect(await city.getAllUnclaimedMedallions(otherAccount.address)).to.equal(8);        
      });
    });
  });

  // Testing moving cops to all 4 locations to change chances of success
  describe("Moving Cops to Different Locations", function () {
    describe("Moving Cop to dealership", function () {
      it("Should change cop location to 1", async function () {
        const { city, otherAccount } = await loadFixture(allCopsAtDealership);
        expect(await city.getCopLocation(3)).to.equal(1);
        expect(await city.getCopLocation(5)).to.equal(1);
        expect(await city.getResult(1)).to.equal(5);
      });
    });
    describe("Moving Cop to prison", function () {
      it("Should change cop location to 2", async function () {
        const { city, otherAccount } = await loadFixture(allCopsAtPrison);
        expect(await city.getCopLocation(3)).to.equal(2);
        expect(await city.getCopLocation(5)).to.equal(2);
        expect(await city.getResult(2)).to.equal(5);
      });
    });
    describe("Moving Cop to casino", function () {
      it("Should change cop location to 3", async function () {
        const { city, otherAccount } = await loadFixture(allCopsAtCasino);
        expect(await city.getCopLocation(3)).to.equal(3);
        expect(await city.getCopLocation(5)).to.equal(3);
        expect(await city.getResult(3)).to.equal(5);
      });
    });
    describe("Moving Cop to bank", function () {
      it("Should change cop location to 4", async function () {
        const { city, otherAccount } = await loadFixture(allCopsAtBank);
        expect(await city.getCopLocation(3)).to.equal(4);
        expect(await city.getCopLocation(5)).to.equal(4);
        expect(await city.getResult(4)).to.equal(5);
      });
    });
  });

  // Testing buying each tier of weapon (with accumulated funds)
  describe("Purchasing Weapons with accumulated funds", function () {
    describe("Buying class 1 Weapon", function () {
      it("Should reward character with class 1 weapon", async function () {
        
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndWait);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 1);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(1);
      });
    });
    describe("Buying class 2 Weapon", function () {
      it("Should reward character with class 2 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndWait);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 2);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(2);
      });
    });
    describe("Buying class 3 Weapon", function () {
      it("Should reward character with class 3 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndWait);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 3);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(3);
      });
    });
    describe("Buying class 4 Weapon", function () {
      it("Should reward character with class 4 weapon", async function () {
        const { city, assets, bills, otherAccount } = await loadFixture(stakeAndWait);
        const gunPurchase = await city.connect(otherAccount).buyGun(0, 4);
        await gunPurchase.wait();
        expect(await assets.getGuns(0)).to.equal(4);
      });
    });
  });

    // Testing committing crimes with chance set to 100 (using accumulated funds)
  describe("Committing Crimes (100% chance) with accumulated funds", function () {
    describe("Stealing car from dealership", function () {
      it("Should win sportscar or supercar", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGunsWaited);
        expect(await city.getUserBalance(otherAccount.address)).to.be.greaterThan(ethers.utils.parseEther((8000).toString()));
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 1);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.sportsCars) + Number(inventory.superCars)).to.equal(1);
        expect(await city.getUserBalance(otherAccount.address)).to.be.lessThan(ethers.utils.parseEther((8000).toString()));
      });
    });
    describe("Breaking out of prison", function () {
      it("Should win street thug or thug leader", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGunsWaited);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 2);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.streetThugs) + Number(inventory.gangLeaders)).to.equal(1);
        expect(await city.getUserBalance(otherAccount.address)).to.be.lessThan(ethers.utils.parseEther((7000).toString()));
      });
    });
    describe("Robbing casino", function () {
      it("Should win chips or stack or vault", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGunsWaited);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 3);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.chips) + Number(inventory.chipStacks)).to.equal(1);
        expect(await city.getUserBalance(otherAccount.address)).to.be.lessThan(ethers.utils.parseEther((5000).toString()));
      });
    });
    describe("Robbing bank", function () {
      it("Should win cash or cash bag", async function () {
        const { city, assets, otherAccount } = await loadFixture(ownsGunsWaited);
        const settingChance = await city.setChance(100);
        await settingChance.wait();
        const crime = await city.connect(otherAccount).crime(0, 4);
        await crime.wait();
        const inventory = await assets.items(otherAccount.address);
        expect(Number(inventory.cashBag) + Number(inventory.cash)).to.equal(1);
        expect(await city.getUserBalance(otherAccount.address)).to.be.lessThan(ethers.utils.parseEther((1000).toString()));
      });
    });
  });
  describe("Withdrawing Accumulated Funds", function () {
    it("Should withdraw ~20,000 $BILLS", async function () {
      const { city, bills, assets, otherAccount } = await loadFixture(stakeAndWait);
      expect(await city.getUserBalance(otherAccount.address)).to.be.greaterThan(ethers.utils.parseEther((20000).toString()));
      const withdraw = await city.connect(otherAccount).withdrawAll(otherAccount.address);
      await withdraw.wait();
      expect(await city.getUserBalance(otherAccount.address)).to.be.lessThan(ethers.utils.parseEther((100).toString()));
      expect(await bills.balanceOf(otherAccount.address)).to.be.greaterThan(ethers.utils.parseEther((20000).toString()));
    });
  });
});
