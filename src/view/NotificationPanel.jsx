"use strict";

var React = require("react");
var _ = require("underscore");
var NotificationSystem = require("react-notification-system");

const logger = require("../util/logger").logger("NotificationPanel");
var Level = require("../constant/notificationConstant").Level;


/**
 * This component never updates.
 * Instead, on receiving a new property, it adds it to the notification system.
 */
var NotificationPanel = React.createClass({
    propTypes: {
        notifications: React.PropTypes.array,
        onDelete: React.PropTypes.func.isRequired
    },

    _notificationSystem: null,

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
        var level = this._getNotificationLevel(notification.level);

        // keep errors until dismissed by user;
        // keep persistent notifications until dismissed by app
        var isPersistent = (notification.level === Level.ERROR) || notification.persistent;

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
        var self = this;

        _.each(nextProps.notifications, function (notification) {
            if (notification.dismiss === true) {
                self._notificationSystem.removeNotification(notification.id);
            }
            else {
                self._notificationSystem.addNotification(self._buildNotification(notification));
            }
        });

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
            <NotificationSystem ref={ ns => { this._notificationSystem = ns; }} />
        );
    }
});

module.exports = NotificationPanel;
