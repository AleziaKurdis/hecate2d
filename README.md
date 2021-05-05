# hecate2d
2D classic Goto application based on the Vircadia's Metaverse Place API.


====================================================

**RULES used to display the Portals from the Metaverse server's place API...**




**Places that are systematically excluded:**

1- Places from an inactive domain.

2- Places where the domain runs a different protocole version.


=======

**Place categories (by appearance):**

1- **RUBY**: "Featured" places randomly picked among the SILVER category, to give a chance to places to be discovered. (Only 1 place in this category.)

2- **BLUESTEAL**: "Frequently Visited", each time a user use a portal, it records the event in a setting that keep the last 30 visited places. In this category, it displays those places (if present) but only if they are present at leat 3 times in the history. They are displayed in order of frequency, then by alphabetically order on the place name.

3- **GOLD**: At the moment there are users in a place, It get assigned to the GOLD category. It orders them by number of users and then by their natural order in the lower categories.

4- **SILVER**: This category contains the places that have all the required information has been correctly setup. (Having a thumbnail and a description).

5- **BRONZE**: This category contains the places that have a thumbnail and but no description.

6- **IRON**: This category contains the places that have a description but no thumbnail.

7- **STONE**: This category contains the places that have no description but no thumbnail.

=======


**Order within a the lower categories (SILVER, BRONZE, IRON, STONE):**

Since a category will contains many places, and since the order in the list can be decisive if it is at the begining of the list versus at the end, it wouldn't make sense to stuck to any alphabetic order.
On the other hand, if we opted for a pure random, it would have make difficult to find a place you might have seen a few hours ago if this one is never at teh same position.

To address that, we used a seeded random based on the current period of 5 days. This means that the order will stay the same for a specific place for the duration of 5 days. Doing this, every places will have equal chances to be at teh begining or at teh end of its category but keeping the possibility to find that place approximately at the same position for at least a few days.
