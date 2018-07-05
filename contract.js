"use strict";

var LotteryItem = function(player, wheelId, txHash, jackpotBalance, timestamp, award, position){
    this.player = player;
    this.wheelId = wheelId;
    this.txHash = txHash;
    this.timestamp = timestamp;
    this.jackpotBalance = jackpotBalance;
    this.award = award;
    this.position = position;
};


var LuckyWheelContract = function(){
    this.award_list = [0.05, 0, 0.01, 0, 0.01, 0, 0.02, 0, 0.01, 0];
    LocalContractStorage.defineProperty(this, "wheelId");
    LocalContractStorage.defineProperty(this, "jackpotBalance", {
        parse: function (text) {
            text = JSON.parse(text);
            return new BigNumber(text);
        },
        stringify: function(o){
            return JSON.stringify(o);
        }
    });
    LocalContractStorage.defineMapProperty(this, "lotteryRecords");
}

LuckyWheelContract.prototype = {
    init: function(){
        this.wheelId = 0;
        this.jackpotBalance = 0;
    },
    lottery: function(wheelId){
        if(wheelId != this.wheelId){
            throw Error("wheelId is Wrong")
        }
        var from = Blockchain.transaction.from;
        var value = new BigNumber(parseInt(Blockchain.transaction.value));
        var txHash = Blockchain.transaction.hash;
        var timestamp = Blockchain.transaction.timestamp;
        // if (value.cmp(this._weitonas(0.01)) == -1){
        //     throw new Error("value is wrong, should be more than 0.01 nas")
        // }
        this.jackpotBalance = this.jackpotBalance.plus(value);
        const award = this._gen_award(txHash);
        var item = new LotteryItem(from, this.wheelId, txHash, this.jackpotBalance, timestamp, award.value, award.position);
        this.lotteryRecords.set(this.wheelId, item);
        this.wheelId += 1;

        if (!award.value.isZero()){
            if(this.jackpotBalance.cmp(award.value) == -1){
                Blockchain.transfer(from, this.jackpotBalance);
                this.jackpotBalance = 0;
            }else{
                this.jackpotBalance = this.jackpotBalance.minus(award.value);
                Blockchain.transfer(from, award.value);
            }
        }
    },
    queryResult: function(wheelId){
        var lotteryItem = this.lotteryRecords.get(wheelId);
        return lotteryItem;
    },
    getWheelId: function(){
        return {'wheelId': this.wheelId};
    },
    _gen_award: function(txHash){
        var position = parseInt(txHash, 16) % this.award_list.length
        var award = {
            position: position,
            value: this._nastowei(new BigNumber(this.award_list[position]))
        }
        return award;
    },
    getHistory: function(start, size){
        var curWheelId = this.wheelId;
        var result = [];
        while(size > 0){
            var item = this.lotteryRecords.get(start);
            if(item){
                result.push(item);
            }
            start -= 1
            if(start < 0){
                break;
            }
        }
        return result;
    },
    getJackpotBalance: function(){
        return {"jackpotBalance": this._weitonas(this.jackpotBalance)};
    },
    _nastowei: function(nas){
        return new BigNumber(nas).mul(new BigNumber(10).pow(18));
    },
    _weitonas: function(wei){
        return new BigNumber(wei).div(new BigNumber(10).pow(18));
    }

};

module.exports = LuckyWheelContract;
