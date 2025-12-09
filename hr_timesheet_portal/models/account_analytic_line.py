# Copyright 2021 Hunki Enterprises BV
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from contextlib import suppress

from odoo import api, models


class AccountAnalyticLine(models.Model):
    _inherit = "account.analytic.line"

    @api.model_create_multi
    def create(self, vals_list):
        # When creating from portal, avoid reading fields that don't exist
        # by using sudo and suppressing KeyError when accessing task fields
        if self.env.context.get("from_portal"):
            for vals in vals_list:
                # If task_id is set, ensure we don't try to read invalid fields
                if vals.get("task_id"):
                    # Use sudo to avoid permission issues
                    task = self.env["project.task"].sudo().browse(vals.get("task_id"))
                    if task.exists():
                        # Only access fields that we know exist
                        with suppress(KeyError, AttributeError):
                            # Try to get project_id if not set
                            if not vals.get("project_id") and task.project_id:
                                vals["project_id"] = task.project_id.id
                            # Try to get account_id if not set
                            if not vals.get("account_id") and hasattr(task.project_id, "account_id"):
                                if task.project_id.account_id:
                                    vals["account_id"] = task.project_id.account_id.id
        return super().create(vals_list)

    def write(self, values):
        # When editing from portal, avoid reading fields that don't exist
        if self.env.context.get("from_portal"):
            # Filter out any problematic fields
            if "task_id" in values:
                task = self.env["project.task"].sudo().browse(values.get("task_id"))
                if task.exists():
                    with suppress(KeyError, AttributeError):
                        # Only access fields that we know exist
                        if not values.get("project_id") and task.project_id:
                            values["project_id"] = task.project_id.id
                        if not values.get("account_id") and hasattr(task.project_id, "account_id"):
                            if task.project_id.account_id:
                                values["account_id"] = task.project_id.account_id.id
        return super().write(values)

