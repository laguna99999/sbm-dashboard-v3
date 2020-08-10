import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { first } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { ParseService } from '../../../core/services/parse.service';
import { CookieService } from '../../../core/services/cookie.service';
import { ExportService } from '../../../core/services/export.service';
import { HistoryService } from '../../../core/services/history.service';

@Component({
    selector: 'app-weekly',
    templateUrl: './weekly.component.html',
    styleUrls: ['./weekly.component.scss']
})
export class WeeklyComponent implements OnInit {

    // Filters
    database: string = JSON.parse(this.cookieService.getCookie('currentUser')).database;
    shops: Object = JSON.parse(JSON.parse(this.cookieService.getCookie('currentUser')).shop_name);
    date_ranges: Object;

    f_criteria: string = 'day';
    f_group: string = 'group_a_id';
    f_causals: Object = [];
    f_causals_checked: Array<{}> = [];

    disable_criteria = [1, 0, 0, 0, 1, 1]; // hour, day, weekday, week, month, year
    // Loaders
    causal_loading: Boolean = false;
    weekly_loading: Boolean = false;

    group_data = [];

    selected_group_id = 0;
    selected_group = {};
    selected_articles = [];

    db_error: Boolean = false;

    advanced_filters: Boolean = false;

    filter_shop: string;
    filter_range: string;
    filter_date: Object;

    constructor(private apiService: ApiService, private cookieService: CookieService, private parseService: ParseService, public exportService: ExportService, public historyService: HistoryService) { }

    ngOnInit() {
        this.filter_shop = this.shops[0];

        this.date_ranges = {
            labels: ['Today', 'Yesterday', 'This week', 'Last week', 'This month', 'Last month', 'This year', 'Last year', 'All time', 'Custom range'],
            ranges: [
                { // Today
                    from: moment().subtract(1, 'days').format('YYYY-MM-DD'),
                    to: moment().subtract(1, 'days').format('YYYY-MM-DD')
                },
                { // Yesterday
                    from: moment().subtract(2, 'days').format('YYYY-MM-DD'),
                    to: moment().subtract(2, 'days').format('YYYY-MM-DD')
                },
                { // This week
                    from: moment().startOf('week').format('YYYY-MM-DD'),
                    to: moment().endOf('week').format('YYYY-MM-DD')
                },
                { // Last week
                    from: moment().subtract(1, 'weeks').startOf('week').format('YYYY-MM-DD'),
                    to: moment().subtract(1, 'weeks').endOf('week').format('YYYY-MM-DD')
                },
                { // This month
                    from: moment().startOf('month').format('YYYY-MM-DD'),
                    to: moment().endOf('month').format('YYYY-MM-DD')
                },
                { // Last month
                    from: moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD'),
                    to: moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD')
                },
                { // This year
                    from: moment().startOf('year').format('YYYY-MM-DD'),
                    to: moment().endOf('year').format('YYYY-MM-DD')
                },
                { // Last year
                    from: moment().subtract(1, 'years').startOf('year').format('YYYY-MM-DD'),
                    to: moment().subtract(1, 'years').endOf('year').format('YYYY-MM-DD')
                },
                { // All time
                    from: '2015-01-01',
                    to: moment().endOf('year').format('YYYY-MM-DD')
                },
                { // Custom range
                    from: moment().subtract(1, 'days').format('YYYY-MM-DD'),
                    to: moment().subtract(1, 'days').format('YYYY-MM-DD')
                }
            ]
        }
        this.filter_range = this.date_ranges['labels'][3];
        this.filter_date = this.date_ranges['ranges'][3];

        this.historyService.logHistory('page', 'Weekly detail visit. Checked weekly detail data for ' + this.filter_shop + ' from ' + this.filter_date['from'] + ' ~ ' + this.filter_date['to']);

        this._fetchWeeklyData();
    }
    filter_range_change(){
        this.filter_date = this.date_ranges['ranges'][this.date_ranges['labels'].indexOf(this.filter_range)];
        if(this.filter_range == 'Custom range'){
            document.querySelector('#filter_date_range').removeAttribute('disabled');
        }else{
            document.querySelector('#filter_date_range').setAttribute('disabled', 'true');
        }
        switch(this.filter_range){
            case 'Today':
                this.disable_criteria = [0, 1, 1, 1, 1, 1];
                this.f_criteria = 'hour';
                break;
            case 'Yesterday':
                this.disable_criteria = [0, 1, 1, 1, 1, 1];
                this.f_criteria = 'hour';
                break;
            case 'This week':
                this.disable_criteria = [1, 0, 0, 1, 1, 1];
                this.f_criteria = 'day';
                break;
            case 'Last week':
                this.disable_criteria = [1, 0, 0, 1, 1, 1];
                this.f_criteria = 'day';
                break;
            case 'This month':
                this.disable_criteria = [1, 0, 0, 0, 1, 1];
                this.f_criteria = 'day';
                break;
            case 'Last month':
                this.disable_criteria = [1, 0, 0, 0, 1, 1];
                this.f_criteria = 'day';
                break;
            case 'This year':
                this.disable_criteria = [1, 0, 0, 0, 0, 1];
                this.f_criteria = 'month';
                break;
            case 'Last year':
                this.disable_criteria = [1, 0, 0, 0, 0, 1];
                this.f_criteria = 'month';
                break;
            case 'All time':
                this.disable_criteria = [1, 0, 0, 0, 0, 0];
                this.f_criteria = 'year';
                break;
            case 'Custom range':
                this.disable_criteria = [0, 0, 0, 0, 0, 0];
                this.f_criteria = 'day';
                break;
        }
    }
    toggle_advanced_filter(){
        this.advanced_filters = !this.advanced_filters;
    }
    criteria_change(e: any){
        this.f_criteria = e.target.value;
    }
    group_change(e: any){
        this.f_group = e.target.value;
    }
    apply_filter(){
        // Do actions
        this.historyService.logHistory('page', 'Weekly detail visit. Checked weekly detail data for ' + this.filter_shop + ' from ' + this.filter_date['from'] + ' ~ ' + this.filter_date['to']);
        this._fetchWeeklyData();
    }
    select_group(id){
        this.selected_group_id = id;
        for(let item of this.group_data){
            if(item.id == id){
                this.selected_group = item;
            }
        }
    }

    public _fetchWeeklyData(){
        this.db_error = false;
        this.weekly_loading = true;
        this.filter_date['from'] = moment(this.filter_date['from']).format('YYYY-MM-DD');
        this.filter_date['to'] = this.filter_date['to'] ? moment(this.filter_date['to']).format('YYYY-MM-DD') : this.filter_date['from'];
        // Force to hour view on one day is selected
        if(this.filter_date['from'] == this.filter_date['to']){
            this.f_criteria = 'hour';
        }
        let data = {
            db: this.database,
            shop: this.filter_shop,
            from: this.filter_date['from'],
            to: this.filter_date['to'],
            d: this.f_criteria,
            group_id: this.f_group
        };
        console.log(data)
        // this.apiService.weekly_detail(this.parseService.encode(data))
        //     .pipe(first())
        //     .subscribe(
        //         data => {
        //             console.log(data)
        //             if(data['status'] == 'success'){
        //
        //             }else{
        //                 this.db_error = true;
        //             }
        //             this.weekly_loading = false;
        //         },
        //         error => {
        //             this.db_error = true;
        //             this.weekly_loading = false;
        //         }
        //     )
    }
}