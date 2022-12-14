import {DateTime} from '../../libs/luxon.min.js';
import htSwal from '../custom-swal.js';
import customUtill from '../custom-utill.js';
import {itemDto} from '../item-manage/model/item-dto.js';
import {rentDto} from '../item-manage/model/rent-dto.js';
import PagingFooterBar from '../paging-util.js';
import {dom as myrentDom} from './dom/myrent-status-dom.js';
import getRentListByUser from './myrent-get-rent-list.js';

let table_9, paging_1, dd_3;
let rentListByUser = [];
let selectedRentList = [];
let pageNumClickRender = undefined;
let pageNum = 1;
const position = {
    pageX: 0,
    pageY: 0,
};

/* ==============================*/
/* ==========  JUI 실행 ==========*/
/* ==============================*/
$(document).on('mousemove', function (event) {
    position.pageX = event.pageX;
    position.pageY = event.pageY;
});
const juiTableColums = [
    '_id',
    'rentNum',
    'itemId',
    'itemCategoryLarge',
    'itemCategorySmall',
    'itemName',
    'rentPurpose',
    'showRentAt',
    'showrExpectReturnAt',
    'isExpire',
    'rentAt',
    'expectReturnAt',
];
const juiGridTable = (rents) => {
    const newItemDto = itemDto;
    let selectRowIndex = 0;
    jui.ready(['ui.dropdown', 'grid.table'], function (dropdown, table) {
        let rows = [];
        const insertRents = (rents) => {
            rents.forEach((e) => {
                rows.push({
                    _id: e._id,
                    rentNum: e.rentNum,
                    itemId: e.rentedItem.itemId,
                    itemCategoryLarge: e.rentedItem.itemCategory.large,
                    itemCategorySmall: e.rentedItem.itemCategory.small,
                    itemName: e.rentedItem.itemName,
                    rentPurpose: e.rentPurpose,
                    expectReturnAt: e.expectReturnAt,
                    showRentAt: ((rentAt) => {
                        if (rentAt === null) return '반납할 필요가 없습니다';
                        else
                            return DateTime.fromISO(rentAt)
                                .setZone('Asia/Seoul')
                                .toLocaleString(DateTime.DATETIME_SHORT);
                    })(e.rentAt),
                    showrExpectReturnAt: ((expectReturnAt) => {
                        if (
                            expectReturnAt === null ||
                            DateTime.fromISO(expectReturnAt) >
                                DateTime.fromISO('2100-01-01T00:00:00.000Z')
                        )
                            return '반납할 필요가 없습니다';
                        else
                            return DateTime.fromISO(expectReturnAt)
                                .setZone('Asia/Seoul')
                                .toLocaleString(DateTime.DATETIME_SHORT);
                    })(e.expectReturnAt),
                    rentAt: e.rentAt,
                    isExpire: e.isExpire,
                });
            });
            return rows;
        };
        let dd = dropdown('#table_9_dd', {
            event: {
                change: async function (data, e) {
                    let result;
                },
            },
        });
        table_9 = table('#table_9', {
            fields: juiTableColums,
            csv: juiTableColums,
            csvNames: juiTableColums,
            data: insertRents(rents),
            colshow: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            editEvent: false,
            resize: true,
            sort: true,
            event: {
                click: (row, e) => {
                    if ($(row.element).hasClass('checked')) {
                        table_9.uncheck(row.index);
                    } else {
                        table_9.check(row.index);
                    }
                },
                sort: function (column, e) {
                    let className = {
                        desc: 'icon-arrow1',
                        asc: 'icon-arrow3',
                    }[column.order];

                    $(column.element).children('i').remove();
                    $(column.element).append(
                        "<i class='" + className + "'></i>"
                    );
                },
            },
        });
        table_9.update(rows);
    });
};
/* ==============================*/
/* ======  end of JUI 실행 ======*/
/* ==============================*/

const itemRetrunBtnClick = (e) => {
    selectedRentList = [];
    table_9.listChecked().forEach((e) => {
        selectedRentList.push(e.data);
    });
    if (selectedRentList.length < 1) {
        htSwal.fire({
            title: `반납하실 물건을 선택하지 않았습니다`,
            text: '물건을 1개이상 선택해주십시오',
            icon: 'error',
            width: 'max-content',
            confirmButtonText: '확인',
        });
    } else {
        htSwal
            .fire({
                title: `총 ${selectedRentList.length}개의 물건을 반납합니다`,
                text: '반납하시겠습니까?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '반납',
                cancelButtonText: '취소',
            })
            .then((e) => {
                if (e.isConfirmed) {
                    $.ajax({
                        url: `/user/rent-return/${newItemDto._id}`,
                        type: 'patch',
                        data: JSON.stringify(selectedRentList),
                        dataType: 'json',
                        contentType: 'application/json',
                        success: function (res, jqxHR) {
                            resolve(res);
                        },
                        error: function (error) {
                            reject(error);
                            //서버오류 500, 찾는 자료없음 404, 권한없음 403, 인증실패 401
                            if (error.status == 404) {
                                htSwal.fire(
                                    '찾는 자료가 없습니다',
                                    '',
                                    'error'
                                );
                            } else if (error.status == 401) {
                                htSwal.fire(
                                    '유효하지 않은 인증입니다',
                                    '',
                                    'error'
                                );
                            } else if (error.status == 403) {
                                htSwal.fire(
                                    '접근 권한이 없습니다',
                                    '',
                                    'error'
                                );
                            } else if (error.status == 500) {
                                htSwal.fire(
                                    '서버 오류 관리자에게 문의 하세요',
                                    '',
                                    'error'
                                );
                            } else {
                                if (error.responseJSON.message === undefined)
                                    htSwal.fire(
                                        '서버 오류 관리자에게 문의 하세요',
                                        '',
                                        'error'
                                    );
                                else
                                    htSwal.fire({
                                        title: `${error.responseJSON.message}`,
                                        icon: 'error',
                                        width: 'max-content',
                                    });
                            }
                        },
                    }); //end of ajax
                }
            }); //end of htSwal.fire-popup
    }
};

async function main() {
    const pagingFooterBar1 = new PagingFooterBar('#js-pagingTableFooter');
    pageNumClickRender = async (pageNum) => {
        rentListByUser = [];
        if (pageNum !== null) {
            rentListByUser = await getRentListByUser(pageNum);
            rentListByUser.rents = rentListByUser.rents || [];

            juiGridTable(rentListByUser.rents);
            pagingFooterBar1.createPageNum(rentListByUser.pageInfo);
        }
    };
    pageNumClickRender(pageNum);
    pagingFooterBar1.prevBtn.addEventListener('click', (e) => {
        pageNum = e.target.getAttribute('data-value');
        pageNumClickRender(pageNum);
    });
    pagingFooterBar1.pageNumList.addEventListener('click', (e) => {
        pageNum = e.target.getAttribute('data-value');
        pageNumClickRender(pageNum);
    });
    pagingFooterBar1.nextBtn.addEventListener('click', (e) => {
        pageNum = e.target.getAttribute('data-value');
        pageNumClickRender(pageNum);
    });

    myrentDom.itemRetrunBtn.addEventListener('click', itemRetrunBtnClick);
    myrentDom.itemUncheckBtn.addEventListener('click', (e) =>
        table_9.uncheckAll()
    );
}
main();
