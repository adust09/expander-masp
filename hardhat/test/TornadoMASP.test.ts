import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("TornadoMASP", function () {
  let tornadoMASP: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Constants
  const ETH_ASSET_ID = 1;
  const DAI_ASSET_ID = 2;
  const USDC_ASSET_ID = 3;
  const USDT_ASSET_ID = 4;

  // Mock ERC20 tokens
  let mockDAI: Contract;
  let mockUSDC: Contract;
  let mockUSDT: Contract;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockDAI = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    mockUSDT = await MockERC20.deploy("Tether USD", "USDT", 6);

    // Mint tokens to user1
    await mockDAI.mint(user1.address, ethers.utils.parseUnits("1000", 18));
    await mockUSDC.mint(user1.address, ethers.utils.parseUnits("1000", 6));
    await mockUSDT.mint(user1.address, ethers.utils.parseUnits("1000", 6));

    // Deploy TornadoMASP
    const TornadoMASP = await ethers.getContractFactory("TornadoMASP");
    tornadoMASP = await TornadoMASP.deploy();

    // Register tokens
    await tornadoMASP.addAsset(DAI_ASSET_ID, mockDAI.address, "DAI", 18);
    await tornadoMASP.addAsset(USDC_ASSET_ID, mockUSDC.address, "USDC", 6);
    await tornadoMASP.addAsset(USDT_ASSET_ID, mockUSDT.address, "USDT", 6);

    // Approve tokens for user1
    await mockDAI
      .connect(user1)
      .approve(tornadoMASP.address, ethers.constants.MaxUint256);
    await mockUSDC
      .connect(user1)
      .approve(tornadoMASP.address, ethers.constants.MaxUint256);
    await mockUSDT
      .connect(user1)
      .approve(tornadoMASP.address, ethers.constants.MaxUint256);
  });

  describe("Asset Management", function () {
    it("Should register assets correctly", async function () {
      // ETH should be registered by default
      const ethAsset = await tornadoMASP.getAssetDetails(ETH_ASSET_ID);
      expect(ethAsset.tokenAddress).to.equal(ethers.constants.AddressZero);
      expect(ethAsset.symbol).to.equal("ETH");
      expect(ethAsset.decimals).to.equal(18);
      expect(ethAsset.isSupported).to.be.true;

      // Check registered tokens
      const daiAsset = await tornadoMASP.getAssetDetails(DAI_ASSET_ID);
      expect(daiAsset.tokenAddress).to.equal(mockDAI.address);
      expect(daiAsset.symbol).to.equal("DAI");
      expect(daiAsset.decimals).to.equal(18);
      expect(daiAsset.isSupported).to.be.true;

      const usdcAsset = await tornadoMASP.getAssetDetails(USDC_ASSET_ID);
      expect(usdcAsset.tokenAddress).to.equal(mockUSDC.address);
      expect(usdcAsset.symbol).to.equal("USDC");
      expect(usdcAsset.decimals).to.equal(6);
      expect(usdcAsset.isSupported).to.be.true;
    });

    it("Should not allow registering the same asset ID twice", async function () {
      await expect(
        tornadoMASP.addAsset(
          DAI_ASSET_ID,
          ethers.constants.AddressZero,
          "TEST",
          18
        )
      ).to.be.revertedWith("Asset already supported");
    });
  });

  describe("ETH Deposits and Withdrawals", function () {
    it("Should deposit and withdraw ETH correctly", async function () {
      // Generate a random commitment
      const secret = ethers.utils.randomBytes(32);
      const nullifier = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.concat([secret, nullifier])
      );

      // Deposit 1 ETH
      const depositAmount = ethers.utils.parseEther("1");
      await tornadoMASP.connect(user1).depositEth(commitment, ETH_ASSET_ID, {
        value: depositAmount,
      });

      // Check contract balance
      expect(await ethers.provider.getBalance(tornadoMASP.address)).to.equal(
        depositAmount
      );
      expect(await tornadoMASP.getAssetBalance(ETH_ASSET_ID)).to.equal(
        depositAmount
      );

      // Get the current root
      const root = await tornadoMASP.getCurrentRoot();

      // Generate nullifier hash
      const nullifierHash = ethers.utils.keccak256(nullifier);

      // Check user2's balance before withdrawal
      const user2BalanceBefore = await ethers.provider.getBalance(
        user2.address
      );

      // Withdraw to user2
      await tornadoMASP
        .connect(user1)
        .withdraw(
          user2.address,
          nullifierHash,
          root,
          ETH_ASSET_ID,
          depositAmount
        );

      // Check user2's balance after withdrawal
      const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
      expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(depositAmount);

      // Check contract balance
      expect(await ethers.provider.getBalance(tornadoMASP.address)).to.equal(0);
      expect(await tornadoMASP.getAssetBalance(ETH_ASSET_ID)).to.equal(0);

      // Should not allow withdrawing with the same nullifier again
      await expect(
        tornadoMASP
          .connect(user1)
          .withdraw(
            user2.address,
            nullifierHash,
            root,
            ETH_ASSET_ID,
            depositAmount
          )
      ).to.be.revertedWith("Nullifier has been spent");
    });
  });

  describe("ERC20 Deposits and Withdrawals", function () {
    it("Should deposit and withdraw DAI correctly", async function () {
      // Generate a random commitment
      const secret = ethers.utils.randomBytes(32);
      const nullifier = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.concat([secret, nullifier])
      );

      // Deposit 100 DAI
      const depositAmount = ethers.utils.parseUnits("100", 18);
      await tornadoMASP
        .connect(user1)
        .depositERC20(commitment, DAI_ASSET_ID, depositAmount, mockDAI.address);

      // Check contract balance
      expect(await mockDAI.balanceOf(tornadoMASP.address)).to.equal(
        depositAmount
      );
      expect(await tornadoMASP.getAssetBalance(DAI_ASSET_ID)).to.equal(
        depositAmount
      );

      // Get the current root
      const root = await tornadoMASP.getCurrentRoot();

      // Generate nullifier hash
      const nullifierHash = ethers.utils.keccak256(nullifier);

      // Check user2's balance before withdrawal
      const user2BalanceBefore = await mockDAI.balanceOf(user2.address);

      // Withdraw to user2
      await tornadoMASP
        .connect(user1)
        .withdraw(
          user2.address,
          nullifierHash,
          root,
          DAI_ASSET_ID,
          depositAmount
        );

      // Check user2's balance after withdrawal
      const user2BalanceAfter = await mockDAI.balanceOf(user2.address);
      expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(depositAmount);

      // Check contract balance
      expect(await mockDAI.balanceOf(tornadoMASP.address)).to.equal(0);
      expect(await tornadoMASP.getAssetBalance(DAI_ASSET_ID)).to.equal(0);
    });

    it("Should handle multiple asset types correctly", async function () {
      // Generate random commitments
      const secretDAI = ethers.utils.randomBytes(32);
      const nullifierDAI = ethers.utils.randomBytes(32);
      const commitmentDAI = ethers.utils.keccak256(
        ethers.utils.concat([secretDAI, nullifierDAI])
      );

      const secretUSDC = ethers.utils.randomBytes(32);
      const nullifierUSDC = ethers.utils.randomBytes(32);
      const commitmentUSDC = ethers.utils.keccak256(
        ethers.utils.concat([secretUSDC, nullifierUSDC])
      );

      // Deposit 100 DAI
      const depositAmountDAI = ethers.utils.parseUnits("100", 18);
      await tornadoMASP
        .connect(user1)
        .depositERC20(
          commitmentDAI,
          DAI_ASSET_ID,
          depositAmountDAI,
          mockDAI.address
        );

      // Deposit 200 USDC
      const depositAmountUSDC = ethers.utils.parseUnits("200", 6);
      await tornadoMASP
        .connect(user1)
        .depositERC20(
          commitmentUSDC,
          USDC_ASSET_ID,
          depositAmountUSDC,
          mockUSDC.address
        );

      // Check contract balances
      expect(await mockDAI.balanceOf(tornadoMASP.address)).to.equal(
        depositAmountDAI
      );
      expect(await mockUSDC.balanceOf(tornadoMASP.address)).to.equal(
        depositAmountUSDC
      );
      expect(await tornadoMASP.getAssetBalance(DAI_ASSET_ID)).to.equal(
        depositAmountDAI
      );
      expect(await tornadoMASP.getAssetBalance(USDC_ASSET_ID)).to.equal(
        depositAmountUSDC
      );

      // Get the current root
      const root = await tornadoMASP.getCurrentRoot();

      // Generate nullifier hashes
      const nullifierHashDAI = ethers.utils.keccak256(nullifierDAI);
      const nullifierHashUSDC = ethers.utils.keccak256(nullifierUSDC);

      // Withdraw DAI to user2
      await tornadoMASP
        .connect(user1)
        .withdraw(
          user2.address,
          nullifierHashDAI,
          root,
          DAI_ASSET_ID,
          depositAmountDAI
        );

      // Withdraw USDC to user2
      await tornadoMASP
        .connect(user1)
        .withdraw(
          user2.address,
          nullifierHashUSDC,
          root,
          USDC_ASSET_ID,
          depositAmountUSDC
        );

      // Check user2's balances
      expect(await mockDAI.balanceOf(user2.address)).to.equal(depositAmountDAI);
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(
        depositAmountUSDC
      );

      // Check contract balances
      expect(await mockDAI.balanceOf(tornadoMASP.address)).to.equal(0);
      expect(await mockUSDC.balanceOf(tornadoMASP.address)).to.equal(0);
      expect(await tornadoMASP.getAssetBalance(DAI_ASSET_ID)).to.equal(0);
      expect(await tornadoMASP.getAssetBalance(USDC_ASSET_ID)).to.equal(0);
    });
  });
});
