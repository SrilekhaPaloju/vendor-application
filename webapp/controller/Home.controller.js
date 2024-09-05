sap.ui.define([
  "./BaseController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
],
  function (Controller, Filter, FilterOperator, MessageBox) {
    "use strict";

    return Controller.extend("com.app.vendorapplication.controller.Home", {
      onInit: function () {
      },
      onReservePress: async function () {
        if (!this.oReserveDialog) {
          this.oReserveDialog = await this.loadFragment("Reserve")
          this.oReserveDialog.attachAfterOpen(this.onReserveDialogOpened.bind(this));
        }
        this.oReserveDialog.open();
        this.getView().byId("parkingLotSelect").getBinding("items").refresh();
      },
      onReserveDialogOpened: function () {
        var today = new Date();
        var maxDate = new Date();
        maxDate.setDate(today.getDate() + 7); // Set max date to 7 days from today

        var oDateTimePicker = this.byId("idDatetimepicker");
        if (oDateTimePicker) {
          oDateTimePicker.setMinDate(today);
          oDateTimePicker.setMaxDate(maxDate); // Set the max date
          oDateTimePicker.setDisplayFormat("yyyy-MM-dd");
        }
        this.filterParkingSlots("Inward");
      },
      onCloseReserveDialog: function () {
        if (this.oReserveDialog.isOpen()) {
          this.oReserveDialog.close()
        }
      },
      onTruckTypeSelect: function (oEvent) {
        // Get the selected transport type
        var sSelectedTransportType = oEvent.getSource().getSelectedKey();
        console.log("Selected Transport Type:", sSelectedTransportType);

        // Get the reference to the parking lot Select control
        var oParkingLotSelect = this.getView().byId("parkingLotSelect");

        // Check if the Select control is found
        if (!oParkingLotSelect) {
          console.error("Parking Lot Select control not found!");
          return;
        }

        // Build the filter based on the selected transport type
        var aFilters = [];
        if (sSelectedTransportType === "Inward" || sSelectedTransportType === "Outward") {
          aFilters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "Available"));
          aFilters.push(new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, sSelectedTransportType));
        }

        // Apply the filter to the parking lot Select control's binding
        var oBinding = oParkingLotSelect.getBinding("items");
        if (oBinding) {
          oBinding.filter(aFilters);
        } else {
          console.error("Binding for parking lot Select control not found!");
        }
      },
      onDateChange: function () {
        var oDatePicker = this.getView().byId("idDatetimepicker");
        var oSelectedDate = oDatePicker.getDateValue();
        var sSelectedTransportType = this.byId("idTrasporttype").getSelectedKey();

        // Handle the case when transport type is not selected
        if (!sSelectedTransportType) {
          sSelectedTransportType = ""; // Fetch all transport types
        }
        var today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize time to the start of the day

        // Check if the selected date is today
        if (oSelectedDate && oSelectedDate.getTime() === today.getTime()) {
          // Fetch the available parking slots for the selected date and transport type
          this.filterParkingSlots(sSelectedTransportType);
        }
        else {
          // Fetch the available parking slots for the selected date and transport type
          this.filterParkingSlotsByDate(oSelectedDate, sSelectedTransportType);
        }
      },
      filterParkingSlots: function (sTransportType) {
        // Get the reference to the parking lot Select control
        var oParkingLotSelect = this.getView().byId("parkingLotSelect");

        // Check if the Select control is found
        if (!oParkingLotSelect) {
          console.error("Parking Lot Select control not found!");
          return;
        }

        // Build the filter based on the provided transport type
        var aFilters = [];
        if (sTransportType === "Inward" || sTransportType === "Outward") {
          aFilters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, "Available"));
          aFilters.push(new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, sTransportType));
        }

        // Apply the filter to the parking lot Select control's binding
        var oBinding = oParkingLotSelect.getBinding("items");
        if (oBinding) {
          oBinding.filter(aFilters);
        } else {
          console.error("Binding for parking lot Select control not found!");
        }
      },
      filterParkingSlotsByDate: async function (oSelectedDate, sTransportType) {
        var oParkingLotSelect = this.getView().byId("parkingLotSelect");

        if (!oParkingLotSelect) {
          console.error("Parking Lot Select control not found!");
          return;
        }

        var aFilters = [];

        // Build the filter based on the transport type
        if (sTransportType === "Inward" || sTransportType === "Outward") {
          aFilters.push(new sap.ui.model.Filter("TransportType", sap.ui.model.FilterOperator.EQ, sTransportType));
        }

            // Get the reserved slots for the selected date
       var reservedSlots = await this.getReservedSlots(oSelectedDate);

       var oBinding = oParkingLotSelect.getBinding("items");
       if (oBinding) {
           var aAllFilters = aFilters.concat([
               new sap.ui.model.Filter("ParkinglotNumber", sap.ui.model.FilterOperator.NE, reservedSlots)
           ]);
           oBinding.filter(aAllFilters);
       } else {
           console.error("Binding for parking lot Select control not found!");
       }
      },
      getReservedSlots: function (oDate) {
        return new Promise((resolve, reject) => {
            var oModel = this.getView().getModel();
            var sFormattedDate = this.formatDateToODate(oDate);
            
            oModel.read("/ZRESERVESet", {
                filters: [new sap.ui.model.Filter("ReserveTime", sap.ui.model.FilterOperator.EQ, sFormattedDate)],
                success: function (oData) {
                    var reservedSlots = oData.results.map(item => item.ParkinglotNumber);
                    resolve(reservedSlots);
                },
                error: function (oError) {
                    console.error("Failed to fetch reserved slots:", oError);
                    reject(oError);
                }
            });
        });
    },
    formatDateToODate: function (date) {
      var year = date.getFullYear();
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  },
      onReserveslotPress: async function () {
        const oUserView = this.getView();
        var sParkingLotNumber = this.byId("parkingLotSelect").getSelectedKey();
        var sVendorName = this.byId("_IDGenVendorInput").getValue();
        var sVehicleNumber = this.byId("_IDGenInput2").getValue();
        var sDriverName = this.byId("_IDDriverInput2").getValue();
        var sPhoneNumber = this.byId("_IDPhnnoInput2").getValue();
        var sTransportType = this.byId("idTrasporttype").getSelectedKey();
        var oDatePicker = oUserView.byId("idDatetimepicker");
        var oSelectedDate = oDatePicker.getDateValue();

        var oModel = this.getView().getModel();
        oModel.setUseBatch(false);
        var ID = this.generateUUID();

        var sFormattedDate = this.formatDateToOData(oSelectedDate);
        let currentDate = new Date();
        let year = currentDate.getFullYear();
        let month = String(currentDate.getMonth() + 1).padStart(2, '0');
        let day = String(currentDate.getDate()).padStart(2, '0');
        const currentDay = `${year}-${month}-${day}`;


        const reserveModel = new sap.ui.model.json.JSONModel({
          Id: ID,
          VendorName: sVendorName,
          Drivername: sDriverName,
          Phonenumber: sPhoneNumber,
          VehicleNumber: sVehicleNumber,
          TransportType: sTransportType,
          ReserveTime: sFormattedDate,
          ParkinglotNumber: sParkingLotNumber
        });

        var bValid = true;
        if (!sVendorName || sVendorName.length < 4) {
          oUserView.byId("_IDGenVendorInput").setValueState("Error");
          oUserView.byId("_IDGenVendorInput").setValueStateText("Vendor Name cannot be Empty");
          bValid = false;
        } else {
          oUserView.byId("_IDGenVendorInput").setValueState("None");
        }
        if (!sDriverName || sDriverName.length < 4) {
          oUserView.byId("_IDDriverInput2").setValueState("Error");
          oUserView.byId("_IDDriverInput2").setValueStateText("Name Must Contain 3 Characters");
          bValid = false;
        } else {
          oUserView.byId("_IDDriverInput2").setValueState("None");
        }
        if (!sPhoneNumber || sPhoneNumber.length !== 10 || !/^\d+$/.test(sPhoneNumber)) {
          oUserView.byId("_IDPhnnoInput2").setValueState("Error");
          oUserView.byId("_IDPhnnoInput2").setValueStateText("Mobile number must be a 10-digit numeric value");

          bValid = false;
        } else {
          oUserView.byId("_IDPhnnoInput2").setValueState("None");
        }
        if (!sVehicleNumber || !/^[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{4}$/.test(sVehicleNumber)) {
          oUserView.byId("_IDGenInput2").setValueState("Error");
          oUserView.byId("_IDGenInput2").setValueStateText("Vehicle number should follow this pattern AP12BG1234");

          bValid = false;
        } else {
          oUserView.byId("_IDGenInput2").setValueState("None");
        }
        if (!sFormattedDate) {
          oUserView.byId("idDatetimepicker").setValueState("Error");
          bValid = false;
        } else {
          oUserView.byId("idDatetimepicker").setValueState("None");
        }
        if (!sParkingLotNumber) {
          oUserView.byId("parkingLotSelect").setValueState("Error");
          bValid = false;
        } else {
          oUserView.byId("parkingLotSelect").setValueState("None");
        }
        if (!bValid) {
          sap.m.MessageToast.show("Please enter correct data");
          return; // Prevent further execution
        }
        this.getView().setModel(reserveModel, "reserveModel");

        var bVehicleExists = await this.checkVehicleExists(oModel, sVehicleNumber);

        if (bVehicleExists) {
          sap.m.MessageBox.error("A slot is already reserved for this vehicle");
          return; // Prevent further execution
        }
        const oPayload = this.getView().getModel("reserveModel").getProperty("/");

        try {
          // Create the reservation entry using OData service
          await new Promise((resolve, reject) => {
            oModel.create("/ZRESERVESet", oPayload, {
              success: resolve,
              error: function (oError) {
                sap.m.MessageBox.error("Failed to reserve: " + oError.message);
                reject(oError);
              }
            });
          });

          // Update the parking lot status to Reserved
          if(currentDay === sFormattedDate){
          const updatedParkingLot = {
            Status: "Reserved"
          };
          await new Promise((resolve, reject) => {
            oModel.update("/zparkinglot1Set('" + sParkingLotNumber + "')", updatedParkingLot, {
              success: resolve,
              error: function (oError) {
                sap.m.MessageBox.error("Failed to update: " + oError.message);
                reject(oError);
              }
            });
          });
        }
          // Close the dialog and show a success message
          this.oReserveDialog.close();
          sap.m.MessageToast.show("Reserved Successfully");

          // Refresh the dropdown for available parking lots
          if (this.byId("parkingLotSelect")) {
            this.byId("parkingLotSelect").getBinding("items").refresh();
          }
          oUserView.byId("parkingLotSelect").setSelectedKey("");
          oUserView.byId("_IDGenVendorInput").setValue("");
          oUserView.byId("_IDGenInput2").setValue("");
          oUserView.byId("_IDPhnnoInput2").setValue("");
          oUserView.byId("idTrasporttype").setSelectedKey("");
          oUserView.byId("_IDDriverInput2").setValue("");
          oDatePicker.setDateValue(null);
          oModel.refresh(true);
        }
        catch (error) {
          console.error("Error during reservation:", error);
        }
      },
      generateUUID: function () {
        debugger
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      formatDateToOData: function (oDate) {
        if (!oDate) {
          return null;
        }
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          pattern: "yyyy-MM-dd"
        });
        return oDateFormat.format(oDate);
      },
      checkVehicleExists: function (oModel, sVehicleNumber) {
        return new Promise(function (resolve, reject) {
          oModel.read("/ZRESERVESet", {
            filters: [new sap.ui.model.Filter("VehicleNumber", sap.ui.model.FilterOperator.EQ, sVehicleNumber)],
            success: function (oData) {
              if (oData.results && oData.results.length > 0) {
                resolve(true);
              } else {
                resolve(false);
              }
            },
            error: function (oError) {
              reject(oError);
            }
          });
        });
      },
    });
  });
