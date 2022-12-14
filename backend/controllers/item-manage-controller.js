import express from 'express';
import mongoose from 'mongoose';
import {ObjectId} from 'mongodb';
import {Item} from '../schemas/itemSchema.js';
import ItemDTO from '../dto/item-dto.js';
import {Counter} from '../schemas/counterSchema.js';
import {ItemCategory} from '../schemas/itemCategorySchema.js';
import ItemService from '../service/item-service.js';
import ExceptionAdvice from '../utils/exception-advice.js';
import paging from '../utils/paging-util.js';
import customUtill from '../utils/custom-utill.js';
import {types, matchType} from '../utils/type-checker.js';
import {ItemIds} from '../schemas/itemIdsSchema.js';
import RentService from '../service/rent-service.js';
import {User} from '../schemas/userSchema.js';

const router = express();

const ItemManageController = {
    getItemPage: (req, res) => {
        res.render('item/item-manage', {
            userInfo: {
                _id: req._id,
                userId: req.userId,
                userRole: req.userRole,
                userName: req.userName,
            },
        });
    },
    getInsertItemPage: async (req, res) => {
        try {
            res.render('item/item-insert', {
                userInfo: {
                    _id: req._id,
                    userId: req.userId,
                    userRole: req.userRole,
                    userName: req.userName,
                },
            });
        } catch (error) {
            console.log(error);
            res.status(404).send({
                ok: false,
                message: '',
            });
        }
    },
    getAllItemCategory: async (req, res) => {
        try {
            const itemCategory = await ItemCategory.find({}).exec();
            res.json(itemCategory);
        } catch (error) {
            console.log(error);
            res.status(404).send({
                ok: false,
                message: '',
            });
        }
    },
    getItemList: async (req, res) => {
        let {
            pageNum,
            itemIsCanRent,
            itemCategoryLarge,
            itemCategorySmall,
            itemSearchSelect,
            itemSearchInput,
            itemSortSelect,
            itemOrberBySelect,
        } = req.query;
        try {
            const result = await ItemService.getItemList(
                pageNum,
                itemIsCanRent,
                itemCategoryLarge,
                itemCategorySmall,
                itemSearchSelect,
                itemSearchInput,
                itemSortSelect,
                itemOrberBySelect
            );
            res.status(200).json(result);
        } catch (error) {
            console.log(error);
            ExceptionAdvice.item(req, res, error);
        }
    },
    getItem: (req, res) => {},
    valiItemId: async (req, res) => {
        try {
            const {itemId} = req.body;
            let result = await ItemService.valiItemId({itemId});

            res.status(200).send(result);
        } catch (error) {
            console.log(error);
            res.status(500).send({
                ok: false,
                message: '',
            });
        }
    },
    valiFastItemId: async (req, res) => {
        try {
            let itemIds = await ItemIds.findOneAndUpdate(
                {name: 'item-ids'},
                {
                    $push: {
                        itemIdList: 1,
                    },
                }
            ).exec();
        } catch (error) {
            console.log(error);
            res.status(500).send({
                ok: false,
                message: '',
            });
        }
    },
    insertItem: async (req, res) => {
        try {
            let result, counted;
            const itemList = req.body;

            //????????? ?????????
            let collectionExists = await mongoose.connection.db
                .listCollections({
                    name: 'itemcategory',
                })
                .toArray();
            if (collectionExists.length <= 0) {
                await ItemCategory.create({
                    itemCategory: {
                        large: '?????????',
                        small: ['?????????'],
                    },
                }).catch((e) => {
                    res.status(400).send({
                        ok: false,
                        message: '?????? ????????? ??????????????????',
                    });
                });
            }

            /**
             * ????????? ?????? ????????????(for)
             */
            let duplicateList = [];
            let unDuplicateList = [];
            const itemListValiForEach = async (itemList) => {
                let result;
                await customUtill.asyncForEach(itemList, async (element) => {
                    try {
                        result = await ItemService.valiItemId({
                            itemId: element.itemId,
                        });

                        if (!result.ok) {
                            duplicateList.push(element);
                        } else {
                            unDuplicateList.push(element);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                });
                return duplicateList;
            };

            const itemListForEach = async (itemList) => {
                await customUtill.asyncForEach(itemList, async (element) => {
                    let insertResult = undefined;
                    let itemDoc = undefined;
                    let itemCategoryDoc = undefined;
                    let itemDto = ItemDTO;
                    counted = await Counter.findOneAndUpdate(
                        {name: 'counter'},
                        {
                            $inc: {
                                itemNum: 1,
                            },
                        }
                    ).exec();
                    itemDto.itemNum = Number(counted.itemNum);
                    itemDto.itemId = element.itemId;
                    itemDto.itemWriter = ObjectId(req._id);
                    itemDto.itemCategory = {
                        large: element.itemCategoryLarge,
                        small: element.itemCategorySmall,
                    };
                    itemDto.itemName = element.itemName;
                    itemDto.itemIsCanRent = JSON.parse(
                        matchType(
                            element.itemIsCanRent,
                            types.STRING
                        ).toLowerCase()
                    );
                    itemDto.itemIsNeedReturn = JSON.parse(
                        matchType(
                            element.itemIsNeedReturn,
                            types.STRING
                        ).toLowerCase()
                    );
                    itemDto.itemTotalAmount = Number(element.itemTotalAmount);
                    itemDto.createdAt = Date.now();
                    itemDoc = await Item.create(itemDto);
                    itemCategoryDoc = await ItemService.updateItemCategory(
                        itemDoc.itemCategory
                    );
                    // ????????? ?????? ??????
                    // await User.findOneAndUpdate(
                    //     {_id: req._id},
                    //     {
                    //         $push: {
                    //             writedItem: itemDoc._id,
                    //         },
                    //     }
                    // ).exec();
                    return itemCategoryDoc;
                });
            };

            let groupByArr = customUtill.groupByCount(itemList, 'itemId');
            let isDupli = groupByArr.filter((el) => el.count > 1);

            if (isDupli.length > 0) {
                res.status(200).json({
                    ok: false,
                    message: '??????????????? ????????? ????????? 1????????? ?????????',
                    checkType: 'self',
                    duplicateList: isDupli,
                });
            } else {
                let idlist = await itemListValiForEach(itemList);
                if (idlist.length > 0) {
                    res.status(200).json({
                        ok: false,
                        message: '?????? ????????? ???????????????',
                        duplicateList: idlist,
                        unDuplicateList: unDuplicateList,
                    });
                } else {
                    itemListForEach(itemList)
                        .then((e) => {
                            res.status(200).json({
                                ok: true,
                                message: '?????? ?????? ??????',
                                result: e,
                            });
                        })
                        .catch((error) => {
                            console.log(error);
                            res.status(400).json({
                                ok: false,
                                message: '????????? ??????????????????',
                            });
                        });
                }
            }
        } catch (error) {
            console.log(error);
        }
    },
    updateItem: async (req, res) => {
        try {
            let result = undefined;
            let newItemDTO = ItemDTO;
            newItemDTO = req.body;
            if (newItemDTO.itemTotalAmount < newItemDTO.itemRentingAmount)
                throw Error('wrong amount');
            newItemDTO.itemCanRentAmount =
                newItemDTO.itemTotalAmount - newItemDTO.itemRentingAmount;
            newItemDTO.updatedAt = new Date().toISOString();

            let thisItem = await Item.findById(ObjectId(newItemDTO._id)).exec();
            let dupChk = await ItemService.valiItemId({
                itemId: newItemDTO.itemId,
            });
            if (dupChk.ok === false && dupChk.itemId !== thisItem.itemId) {
                res.status(200).json({
                    ok: false,
                    message: dupChk.message,
                    duplicateedId: dupChk.itemId,
                });
            } else {
                result = await Item.findOneAndUpdate(
                    {_id: newItemDTO._id, isDelete: false},
                    newItemDTO
                ).exec();
                result = await ItemService.updateItemCategory(
                    newItemDTO.itemCategory
                );
                result = await RentService.updateRentedItemByItem(newItemDTO);
                if (result) {
                    res.status(200).json({
                        ok: true,
                        itemNum: newItemDTO.itemNum,
                        message: `?????? ?????? ??????`,
                    });
                } else {
                    throw Error('??????????????? ????????? ??????????????????');
                }
            }
        } catch (error) {
            console.log(error);
            if (error.message === 'wrong amount') {
                res.status(400).json({
                    ok: false,
                    message: `??? ????????? ?????? ??? ???????????? ?????? ??? ????????????`,
                });
            }
            res.status(500).json({
                ok: false,
                message: `${error.message}`,
            });
        }
    },
    deleteItem: async (req, res) => {
        let result = false;
        try {
            const itemObjectId = req.params.itemObjectId;
            let result = await Item.findOneAndUpdate(
                {_id: itemObjectId},
                {isDelete: true}
            ).exec();
            result = await RentService.setDeleteRentedItemByItem(itemObjectId);
            if (result) {
                res.status(200).json({
                    ok: true,
                    itemNum: result.itemNum,
                    message: `?????? ?????? ??????`,
                });
            } else {
                throw Error('??????????????? ????????? ??????????????????');
            }
        } catch (error) {
            console.log(error);
            res.status(404).json({
                ok: false,
                message: `${error.message}`,
            });
        }
    },
    getHistoryListByItem: (req, res) => {},
    getRenterListByItem: (req, res) => {
        const itemObjectId = req.params.itemObjectId;
        res.status(200).send({
            ok: true,
            message: `${itemId}????????? ??????`,
        });
    },
    exportByAllItemList: (req, res) => {},
};

export default ItemManageController;
