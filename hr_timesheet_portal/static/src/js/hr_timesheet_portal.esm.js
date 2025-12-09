/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";
import {session} from "@web/session";
import {jsonrpc} from "@web/core/network/rpc";

export const HrTimesheetPortal = publicWidget.Widget.extend({
    selector: "div.hr_timesheet_portal",
    disabledInEditableMode: true,
    events: {
        "click h5 .fa-plus": "_onclick_add",
        "click tr[data-line-id].editable:not(.edit)": "_onclick_edit",
        "click tr[data-line-id].editable i.fa-remove": "_onclick_delete",
        "click button.submit": "_onclick_submit",
        "submit form": "_onclick_submit",
        "click button.cancel": "_reload_timesheet",
    },

    /**
     * @override
     */
    init() {
        this._super(...arguments);
    },

    _onclick_delete: async function (e) {
        e.stopPropagation();
        e.preventDefault();
        const self = this;
        const line = jQuery(e.currentTarget).parents("tr").data("line-id");
        try {
            await jsonrpc("/web/dataset/call_kw", {
                model: "account.analytic.line",
                method: "unlink",
                args: [[line]],
                kwargs: {},
            });
            await self._reload_timesheet();
        } catch (error) {
            self._display_failure(error);
        }
    },

    _onclick_add: async function (e) {
        e.preventDefault();
        const self = this;
        const uid =
            (Array.isArray(session.user_id) ? session.user_id[0] : session.user_id);
        const account = this.$el.data("account-id");
        const project = this.$el.data("project-id");
        const task = this.$el.data("task-id");

        try {
            const result = await jsonrpc("/web/dataset/call_kw", {
                model: "account.analytic.line",
                method: "create",
                args: [[{
                    user_id: uid,
                    account_id: account,
                    project_id: project,
                    task_id: task,
                    unit_amount: 0,
                    name: "/",
                }]],
                kwargs: {},
            });
            const line_id = Array.isArray(result) ? result[0] : result;
            await self._reload_timesheet();
            setTimeout(function() {
                self._edit_line(line_id);
            }, 0);
        } catch (error) {
            self._display_failure(error);
        }
    },

    _onclick_edit: function (e) {
        return this._edit_line(jQuery(e.target).parents("tr").data("line-id"));
    },

    _onclick_submit: async function (e) {
        e.preventDefault();
        const self = this;
        const $tr = jQuery(e.target).parents("tr");
        const line_id = $tr.data("line-id");
        const data = Object.fromEntries(
            $tr
                .find("form")
                .serializeArray()
                .map((field) => [field.name, field.value])
        );
        try {
            await jsonrpc("/web/dataset/call_kw", {
                model: "account.analytic.line",
                method: "write",
                args: [[line_id], data],
                kwargs: {},
            });
            await self._reload_timesheet();
        } catch (error) {
            self._display_failure(error);
        }
    },

    _reload_timesheet: async function () {
        const self = this;
        this.$el.children("div.alert").remove();
        try {
            const response = await fetch(window.location.href);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const timesheets = Array.from(doc.querySelectorAll("div.hr_timesheet_portal"));

            const $tableTimesheet = $(".hr_timesheet_portal .o_portal_my_doc_table");
            const $tableSubtotal = $(".hr_timesheet_portal .container_subtotal table");
            $tableTimesheet.find("tbody").remove();
            $tableSubtotal.find("tbody").remove();

            if (timesheets.length > 0) {
                const $newTable = jQuery(timesheets[0]);
                const $tbodyTimesheet = $newTable.find(".o_portal_my_doc_table tbody");
                const $tbodySubtotal = $newTable.find(".container_subtotal table tbody");
                if ($tbodyTimesheet.length && $tbodyTimesheet.children().length > 0) {
                    $tableTimesheet.append($tbodyTimesheet);
                }
                if ($tbodySubtotal.length && $tbodySubtotal.children().length > 0) {
                    $tableSubtotal.append($tbodySubtotal);
                }
            }
        } catch (error) {
            console.error("Error reloading timesheet:", error);
        }
    },

    _display_failure: function (error) {
        const message = error?.data?.message || error?.message || "An error occurred";
        this.$el.prepend(
            jQuery('<div class="alert alert-danger">').text(message)
        );
    },

    _edit_line(line_id) {
        const $line = this.$(`tr[data-line-id="${line_id}"]`),
            $edit_line = $line.clone();
        this.$("tbody tr.edit").remove();
        this.$("tbody tr").show();
        $line.before($edit_line);
        $edit_line.children("[data-field-name]").each(function () {
            const $this = jQuery(this),
                $input = jQuery("<input>", {
                    class: "form-control",
                    type: $this.data("field-type") || "text",
                    value: $this.data("field-value") || $this.text(),
                    form: "hr_timesheet_portal_form",
                    name: $this.data("field-name"),
                });
            $this.empty().append($input);
        });
        $edit_line.addClass("edit");
        const $form = jQuery("<form>", {
                id: "hr_timesheet_portal_form",
            }),
            $submit = jQuery(
                '<button class="btn btn-primary submit fa fa-cloud-upload">'
            ),
            $cancel = jQuery(
                '<button class="btn btn-outline-primary cancel fa fa-undo" type="reset">'
            );
        $edit_line.children("td:last-child").append($form);
        $form.append($submit, $cancel);
        $edit_line.find("input:first").focus();
        $line.hide();
    },
});

publicWidget.registry.HrTimesheetPortal = HrTimesheetPortal;

