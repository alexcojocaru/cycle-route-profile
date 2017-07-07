"use strict";

const React = require("react");
const _ = require("underscore");
const NotificationSystem = require("react-notification-system");

const logger = require("../util/logger").logger("NotificationPanel");
const Level = require("../constant/notificationConstant").Level;


/**
 * This component never updates.
 * Instead, on receiving a new property, it adds it to the notification system.
 */
const NotificationPanel = React.createClass({
    propTypes: {
        notifications: React.PropTypes.array,
        onDelete: React.PropTypes.func.isRequired
    },

    notificationSystem: null,
    permanentNotifications: [],

    /**
     * Get the notification level corresonding to the given notification type
     * (ie. convert from NotificationType to a level known by the NotificationSystem).
     * @param {string} notificationLevel - the notification level
     * @return {string} - the notification level to be used with the notification module
     */
    _getNotificationLevel: function (notificationLevel) {
        switch (notificationLevel) {
            case Level.ERROR:
                return "error";
            case Level.SUCCESS:
                return "success";
            case Level.WARNING:
                return "warning";
            case Level.INFO:
                return "info";
            default:
                logger.error(`Unknown notification level: ${notificationLevel}; default to INFO`);
                return "info";
        }
    },

    /**
     * Build a notification object to be added to the notification system.
     * @param {object} notification - the notification
     * @return {object} - the notification object to be used with the notification module
     */
    _buildNotification: function (notification) {
        const level = this._getNotificationLevel(notification.level);

        // keep errors until dismissed by user;
        // keep persistent notifications until dismissed by app
        const isPersistent = (notification.level === Level.ERROR) || notification.persistent;

        return {
            level: level,
            title: notification.title,
            message: notification.message,
            position: "tr",
            dismissible: !notification.persistent,
            autoDismiss: isPersistent ? 0 : 5,
            uid: notification.id
        };
    },

    componentWillReceiveProps: function (nextProps) {
        logger.debug("New notifications:", nextProps.notifications);

        const self = this;

        _.each(nextProps.notifications, function (notification) {
            if (notification.dismiss === true) {
                logger.trace("Removing notification:", notification.id);
                self.notificationSystem.removeNotification(notification.id);
            }
            else {
                const displayableNotification = self._buildNotification(notification);
                if (_.contains(self.permanentNotifications, notification.id)) {
                    logger.trace("Editing notification:", notification.id);
                    self.notificationSystem.editNotification(
                            notification.id,
                            displayableNotification);
                }
                else {
                    logger.trace("Adding notification:", notification.id);
                    self.notificationSystem.addNotification(displayableNotification);
                }
            }
        });

        // Persistent notifications can be edited.
        // The notifications API does not have support for querying the list of displayed
        // notifications, therefore I need to maintain the list myself :-(
        logger.debug("Persistent notifications to be updated:", self.permanentNotifications);
        _.each(nextProps.notifications, n => {
            // keep track of the displayed permanent notifications
            if (n.persistent) {
                logger.trace("Adding persistent notification ID:", n.id);
                self.permanentNotifications.push(n.id);
            }
            // remove a permanent notification once it gets dismissed
            if (n.dismiss) {
                logger.trace("Removing persistent notification ID:", n.id);
                self.permanentNotifications = _.without(self.permanentNotifications, n.id);
            }
        });
        logger.debug("Persistent notifications being tracked:", self.permanentNotifications);

        const ids = _.pluck(nextProps.notifications, "id");
        if (ids.length) {
            // delete the notifications from the store,
            // so I don't add them again to the notification system
            // the next time new props are received
            self.props.onDelete(ids);
        }
    },

    shouldComponentUpdate: function () {
        return false;
    },

    render: function () {
        return (
            <NotificationSystem ref={ ns => { this.notificationSystem = ns; }} />
        );
    }
});

module.exports = NotificationPanel;
